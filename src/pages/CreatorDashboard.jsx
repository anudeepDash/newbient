import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Target from 'lucide-react/dist/esm/icons/target';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Clock from 'lucide-react/dist/esm/icons/clock';
import History from 'lucide-react/dist/esm/icons/history';
import X from 'lucide-react/dist/esm/icons/x';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Video from 'lucide-react/dist/esm/icons/video';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Star from 'lucide-react/dist/esm/icons/star';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Clipboard from 'lucide-react/dist/esm/icons/clipboard';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Award from 'lucide-react/dist/esm/icons/award';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Users from 'lucide-react/dist/esm/icons/users';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
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

const scrollContainer = (id, direction) => {
    const container = document.getElementById(id);
    if (container) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
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
                className="relative w-full max-w-4xl bg-[#0a0a0a] border md:border-white/10 rounded-none md:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row h-[100dvh] md:h-auto md:max-h-[90vh]"
            >
                {/* Left Side: Creative & Guidelines */}
                <div className="flex-1 md:w-1/2 p-6 md:p-12 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-white/10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neon-blue shadow-[0_0_30px_rgba(46,191,255,0.1)]">
                            <TypeInfo.icon size={24} className="md:size-[28px]" />
                        </div>
                        <div>
                            <span className="text-[8px] md:text-[10px] font-black text-neon-blue uppercase tracking-[0.3em]">Deliverable Segment</span>
                            <h2 className="text-2xl md:text-3xl font-black font-heading uppercase text-white tracking-tighter leading-none mt-1">{task.title}</h2>
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
                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Campaign Brief</h4>
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
                <div className="flex-1 md:w-1/2 p-6 md:p-12 overflow-y-auto bg-gradient-to-br from-white/[0.02] to-transparent relative">
                    <button onClick={onClose} className="absolute top-6 md:top-8 right-6 md:right-8 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all border border-white/5">
                        <X size={18} />
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

// --- Creator Settings Panel (Embedded) ---
const CreatorSettingsView = ({ profile }) => {
    const { updateCreator, deleteCreator, logout } = useStore();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [form, setForm] = useState({
        name: profile.name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        specializations: (profile.specializations || profile.niches || []).join(', '),
        bio: profile.bio || '',
        profilePicture: profile.profilePicture || ''
    });

    const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsSaving(true);
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            setForm(prev => ({ ...prev, profilePicture: url }));
            useStore.getState().addToast("Profile picture updated!", 'success');
        } catch (error) {
            useStore.getState().addToast("Couldn't upload your photo. Please try again.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateCreator(profile.uid, {
                ...form,
                specializations: form.specializations.split(',').map(s => s.trim())
            });
            useStore.getState().addToast("Profile saved successfully!", 'success');
        } catch (err) {
            useStore.getState().addToast("Couldn't save your profile. Please try again.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProfile = async () => {
        setIsSaving(true);
        try {
            await deleteCreator(profile.uid);
            await logout();
            navigate('/');
        } catch (err) {
            useStore.getState().addToast("Failed to delete profile.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {showDeleteConfirm ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-8 bg-red-500/5 border border-red-500/10 rounded-[3rem] p-12">
                    <div className="text-center space-y-4">
                        <AlertCircle size={64} className="text-red-500 mx-auto" />
                        <h4 className="text-4xl font-black font-heading uppercase italic tracking-tighter text-white">Security Protocol: Deactivation</h4>
                        <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed max-w-md mx-auto">
                            Warning: This will permanently remove your creator profile and eligibility for upcoming missions. This action is irreversible.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <button 
                            onClick={handleDeleteProfile}
                            disabled={isSaving}
                            className="h-16 flex-1 bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-3"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : 'Confirm Deletion'}
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="h-16 flex-1 bg-white/5 text-gray-500 font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-white/10 transition-all"
                        >
                            Abort
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column: Identity & Bio */}
                    <div className="lg:col-span-7 space-y-8">
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                                
                                <div className="flex items-center gap-6 mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-neon-blue">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black font-heading uppercase italic tracking-tighter">Identity Profile</h3>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Public Commercial Identity</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                                        <input required name="name" value={form.name} onChange={handleChange} className="w-full h-14 bg-black/60 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contact Number</label>
                                        <input required name="phone" type="tel" value={form.phone} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Operational Hub (City)</label>
                                        <input required name="city" value={form.city} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specializations</label>
                                        <input required name="specializations" value={form.specializations} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Strategic Bio</label>
                                    <textarea required name="bio" value={form.bio} onChange={handleChange} className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold focus:border-neon-blue transition-all resize-none shadow-inner leading-relaxed" />
                                </div>

                                <button type="submit" disabled={isSaving} className="w-full h-16 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-neon-blue transition-all shadow-xl flex items-center justify-center gap-3">
                                    {isSaving ? <Loader2 className="animate-spin" /> : <><RefreshCw size={18} /> Synchronize Profile</>}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Identity Assets & Danger Zone */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 space-y-8 relative overflow-hidden">
                             <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white">
                                    <ImageIcon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black font-heading uppercase italic tracking-tighter">Identity Asset</h3>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Profile Visuals</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-8 py-4">
                                <div className="relative group">
                                    <div className="w-48 h-48 rounded-[3.5rem] bg-black border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-neon-blue/40 shadow-2xl">
                                        {form.profilePicture ? (
                                            <img src={form.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera size={48} className="text-gray-700" />
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 w-14 h-14 bg-neon-blue text-black rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                        <Upload size={24} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Verification Status</p>
                                    <div className="mt-3 px-6 py-2 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[10px] font-black tracking-widest inline-block">
                                        {profile.profileStatus?.toUpperCase() || 'ACTIVE'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/10 rounded-[3rem] p-10 space-y-6">
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.5em] mb-4 text-center">DANGER ZONE</h4>
                            <button onClick={() => setShowDeleteConfirm(true)} type="button" className="w-full h-16 rounded-2xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3">
                                <AlertCircle size={16} /> Deactivate Creator Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                className="relative w-full max-w-xl bg-[#0a0a0a] lg:border-l border-white/10 h-[100dvh] lg:h-full overflow-hidden flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.5)]"
            >
                {/* Thumbnail */}
                <div className="aspect-video relative overflow-hidden bg-black shrink-0">
                    {campaign.thumbnail ? (
                        <img 
                            src={campaign.thumbnail} 
                            alt={campaign.title} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <span className="text-[10px] font-black text-white/5 uppercase tracking-[0.5em] italic">Mission Asset</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                    
                    {/* Floating Close Button */}
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all z-10 shadow-2xl"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Panel Header */}
                <div className="px-6 md:px-10 pt-10 pb-8 border-b border-white/10 bg-[#0a0a0a] shrink-0">
                    <div className="flex items-start justify-between gap-6 mb-8">
                        <div className="flex-1 min-w-0">
                            <span className="text-[9px] md:text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] opacity-60">Creator Workspace</span>
                            <h2 className="text-2xl md:text-3xl font-black font-heading uppercase tracking-tight text-white mt-1.5 italic leading-none pr-4">
                                {campaign.title}
                            </h2>
                            <div className="mt-4">
                                <div className={cn(
                                    "text-[10px] md:text-xs font-bold uppercase tracking-wider leading-relaxed transition-all duration-300 overflow-hidden relative text-gray-500",
                                    !isExpanded && "max-h-[60px] md:max-h-[80px]"
                                )}>
                                    {campaign.description ? (
                                        <div className="article-content" dangerouslySetInnerHTML={{ __html: campaign.description }} />
                                    ) : (
                                        <span>No additional details provided for this campaign.</span>
                                    )}
                                    
                                    {!isExpanded && campaign.description && campaign.description.length > 80 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
                                    )}
                                </div>
                                
                                {campaign.description && (campaign.description.split('\n').length > 3 || campaign.description.length > 80) && (
                                    <button 
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="text-[9px] font-black text-neon-blue/80 hover:text-white uppercase tracking-[0.3em] mt-3 transition-colors flex items-center gap-2 group"
                                    >
                                        {isExpanded ? 'MINIMIZE DESCRIPTION' : 'VIEW FULL DETAILS'}
                                        <div className="w-4 h-px bg-neon-blue/20 group-hover:w-8 transition-all" />
                                    </button>
                                )}
                            </div>
                        </div>
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
                                    {approvedTotal}/{campaignTasks.length} DELIVERABLES COMPLETED
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
                                <h4 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white pr-4">Identity Review</h4>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed max-w-[240px] mx-auto uppercase tracking-widest mt-3">
                                    WE ARE VERIFYING YOUR PROFILE. ACCESS TO CAMPAIGNS WILL BE UNLOCKED UPON APPROVAL.
                                </p>
                            </div>
                        </div>
                    ) : !isJoined ? (
                        <div className="space-y-10">
                            {/* Detailed Brief Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] w-6 bg-neon-blue/40" />
                                    <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.5em]">Campaign Details // Full Brief</h3>
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
                                <h4 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white pr-4">Selection Phase</h4>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed max-w-[240px] mx-auto uppercase tracking-widest mt-3">
                                    APPLICATION RECEIVED. WE WILL NOTIFY YOU ONCE YOU ARE SHORTLISTED.
                                </p>
                            </div>
                        </div>
                    ) : campaignTasks.length === 0 ? (
                        <div className="p-10 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] text-center space-y-6">
                            <Zap size={40} className="text-neon-blue mx-auto animate-pulse" />
                            <div>
                                <h4 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white pr-4">Application Approved</h4>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed max-w-[240px] mx-auto uppercase tracking-widest mt-3">
                                    YOU ARE SELECTED! TASKS FOR THIS CAMPAIGN WILL BE UPDATED SOON.
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
    const { user, authInitialized, creators, campaigns, uploadToCloudinary, loading } = useStore();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [activeDashboardTab, setActiveDashboardTab] = useState('workspace'); // 'workspace' or 'settings'
    const [activeTab, setActiveTab] = useState('opportunities');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [missionCampaign, setMissionCampaign] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const [isWorkspacePanelOpen, setIsWorkspacePanelOpen] = useState(false);

    useEffect(() => {
        if (authInitialized && !loading && user) {
            const existingProfile = creators.find(c => c.uid === user.uid);
            if (existingProfile) {
                setProfile(existingProfile);
            } else {
                navigate('/creator');
            }
        } else if (authInitialized && !loading && !user) {
            navigate('/creator');
        }
    }, [user, authInitialized, loading, creators, navigate]);

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
            useStore.getState().addToast("Please provide a content link or upload proof.", 'error');
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
            useStore.getState().addToast("Submission failed. Please try again.", 'error');
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
            useStore.getState().addToast("Couldn't submit your application. Please try again.", 'error');
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
        <div className="min-h-screen bg-[#020202] text-white pt-24 pb-20 relative overflow-hidden">
            {/* Cinematic Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[150px] animate-pulse delay-700" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-transparent via-black/40 to-black z-10" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
                {/* STUDIO NAVIGATION TABS */}
                {/* STUDIO NAVIGATION TABS */}
                <div className="flex justify-center mb-16 overflow-x-auto scrollbar-hide py-4 px-2">
                    <div className="flex items-center gap-1.5 md:gap-3 bg-white/[0.02] p-1.5 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl min-w-max">
                        <div className="flex items-center p-1 bg-black/20 rounded-full border border-white/5">
                            <button 
                                onClick={() => setActiveDashboardTab('workspace')}
                                className={cn(
                                    "px-5 md:px-8 py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative z-10",
                                    activeDashboardTab === 'workspace' ? "text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {activeDashboardTab === 'workspace' && (
                                    <motion.div 
                                        layoutId="dashboard-tab-pill"
                                        className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                                Workspace
                            </button>
                            <button 
                                onClick={() => setActiveDashboardTab('settings')}
                                className={cn(
                                    "px-5 md:px-8 py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative z-10",
                                    activeDashboardTab === 'settings' ? "text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {activeDashboardTab === 'settings' && (
                                    <motion.div 
                                        layoutId="dashboard-tab-pill"
                                        className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                                Settings
                            </button>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <button 
                            onClick={() => setIsWorkspacePanelOpen(true)}
                            className="h-11 px-5 md:px-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center gap-3 md:gap-4 text-gray-500 hover:text-neon-blue hover:bg-white/5 hover:border-neon-blue/30 transition-all group shadow-xl"
                        >
                            <LayoutDashboard size={14} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Hub</span>
                            <div className="relative">
                                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full shadow-[0_0_8px_rgba(46,191,255,0.6)]" />
                                <div className="absolute inset-0 w-1.5 h-1.5 bg-neon-blue rounded-full animate-ping opacity-75" />
                            </div>
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeDashboardTab === 'workspace' ? (
                        <motion.div
                            key="workspace"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                               {/* Command Bar Header */}
                {/* Redesigned Command Header */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end mb-24 relative">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-7 space-y-8"
                    >
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-[2rem] blur opacity-20" />
                                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl">
                                    {profile?.profilePicture ? (
                                        <img src={profile.profilePicture} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white italic">
                                            {profile?.name?.charAt(0) || 'C'}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#020202] rounded-full flex items-center justify-center border border-white/5">
                                    <div className="w-5 h-5 bg-neon-green rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                                        <CheckCircle2 size={12} className="text-black" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 text-neon-blue font-black tracking-[0.4em] text-[10px] uppercase mb-2">
                                    <Zap size={14} className="animate-pulse" />
                                    Active Workspace
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tight uppercase italic leading-tight text-white pr-4 overflow-visible">
                                    Hello, <span className="inline-block pr-12 -mr-12 italic text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-500">{profile?.name?.split(' ')[0] || 'Creator'}</span>
                                </h2>
                                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mt-4 flex items-center gap-3">
                                    <span className="w-8 h-px bg-white/10" />
                                    Command center synchronized
                                </p>
                            </div>
                        </div>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-5"
                    >
                        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex items-center shadow-2xl overflow-hidden group">
                            <div className="flex-1 grid grid-cols-3 divide-x divide-white/5 py-4">
                                <div className="flex flex-col items-center justify-center px-4">
                                    <span className="text-2xl font-black text-white italic leading-none">{joinedCampaignsList.length}</span>
                                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Campaigns</span>
                                </div>
                                <div className="flex flex-col items-center justify-center px-4">
                                    <span className="text-2xl font-black text-white italic leading-none">{approvedTasks}</span>
                                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Deliverables</span>
                                </div>
                                <div className="flex flex-col items-center justify-center px-4">
                                    <span className="text-2xl font-black text-neon-blue italic leading-none">{totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0}%</span>
                                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Efficiency</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setActiveDashboardTab('settings')}
                                className="w-16 h-16 bg-white/5 hover:bg-white hover:text-black rounded-2xl flex items-center justify-center transition-all m-1 group/btn border border-white/5 shadow-inner"
                            >
                                <Settings size={20} className="group-hover/btn:rotate-90 transition-transform duration-500" />
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-16 md:space-y-24">
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
                                        <h3 className="text-3xl font-black font-heading uppercase italic text-white tracking-tighter pr-4">Priority Campaigns</h3>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Executive fulfillment required</p>
                                    </div>
                                </div>

                                {/* Navigation Arrows */}
                                <div className="flex items-center gap-2 md:hidden">
                                    <button onClick={() => scrollContainer('priority-campaigns-scroll', 'left')} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </button>
                                    <button onClick={() => scrollContainer('priority-campaigns-scroll', 'right')} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div id="priority-campaigns-scroll" className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 pb-4 scrollbar-hide snap-x">
                                {shortlistedCampaignsList.map(c => (
                                    <div key={c.id} className="min-w-[280px] w-[280px] md:min-w-0 md:w-auto snap-start">
                                        <CampaignCard campaign={c} profile={profile} type="joined" onOpenMission={setMissionCampaign} />
                                    </div>
                                ))}
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
                            <div className="flex items-center gap-4 w-full md:w-auto relative group/nav">
                                {/* Navigation Arrows */}
                                <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover/nav:opacity-100 transition-opacity z-20 pointer-events-none md:hidden">
                                    <button onClick={(e) => { e.stopPropagation(); scrollContainer('nav-tabs', 'left'); }} className="w-8 h-8 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white pointer-events-auto shadow-2xl">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </button>
                                </div>
                                <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover/nav:opacity-100 transition-opacity z-20 pointer-events-none md:hidden">
                                    <button onClick={(e) => { e.stopPropagation(); scrollContainer('nav-tabs', 'right'); }} className="w-8 h-8 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white pointer-events-auto shadow-2xl">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div id="nav-tabs" className="flex items-center gap-6 md:gap-12 w-full overflow-x-auto scrollbar-hide snap-x">
                                    {['opportunities', 'active'].map((tab) => (
                                        <button 
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                "text-lg md:text-xl font-black font-heading uppercase tracking-tighter transition-all relative pb-3 shrink-0 snap-start",
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
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                <div className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 mr-auto md:mr-0">
                                    <span className="text-white mr-2">{activeTab === 'opportunities' ? availableCampaigns.length : joinedCampaignsList.length}</span>
                                    {activeTab === 'opportunities' ? 'GIGS DISCOVERED' : 'CAMPAIGNS TRACKED'}
                                </div>

                                {/* Navigation Arrows */}
                                <div className="flex items-center gap-2 md:hidden">
                                    <button onClick={() => scrollContainer('opportunities-scroll', 'left')} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </button>
                                    <button onClick={() => scrollContainer('opportunities-scroll', 'right')} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div id="opportunities-scroll" className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 pb-4 scrollbar-hide snap-x">
                            <AnimatePresence mode="popLayout">
                                {(activeTab === 'opportunities' ? availableCampaigns : joinedCampaignsList).map(c => (
                                    <motion.div
                                        key={c.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="min-w-[280px] w-[280px] md:min-w-0 md:w-auto snap-start"
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
                                <h4 className="text-2xl font-black font-heading uppercase italic tracking-tighter text-gray-600 pr-4">Nothing discovered yet.</h4>
                                <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest mt-2 px-10">Keep your impact high. New opportunities are unlocked based on your specialized ranking.</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        ) : (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-16"
                    >
                        <div className="flex items-center gap-4 text-neon-pink font-black tracking-[0.5em] text-[10px] uppercase mb-12">
                            <Settings size={14} className="animate-spin-slow" />
                            Security & Identity Parameters
                        </div>
                        
                        <CreatorSettingsView profile={profile} />
                    </motion.div>
                )}
            </AnimatePresence>
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
                {isWorkspacePanelOpen && (
                    <WorkspaceOverviewPanel 
                        profile={profile}
                        stats={{
                            approvedTasks,
                            totalTasks,
                            activeCampaigns: joinedCampaignsList.length,
                            efficiency: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
                        }}
                        onClose={() => setIsWorkspacePanelOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* --- Redesigned Components --- */

const WorkspaceOverviewPanel = ({ profile, stats, onClose }) => {
    const status = profile?.profileStatus || 'pending';
    
    const getStatusConfig = () => {
        switch(status) {
            case 'approved': return { label: 'VERIFIED', color: 'text-neon-green', icon: ShieldCheck, bg: 'bg-neon-green/10' };
            case 'blocked': return { label: 'BLOCKED', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' };
            case 'rejected': return { label: 'REJECTED', color: 'text-red-400', icon: AlertCircle, bg: 'bg-red-400/5' };
            case 'removed': return { label: 'DEACTIVATED', color: 'text-gray-500', icon: Trash2, bg: 'bg-white/5' };
            default: return { label: 'UNDER REVIEW', color: 'text-yellow-500', icon: Clock, bg: 'bg-yellow-500/10' };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 backdrop-blur-md" 
                onClick={onClose} 
            />
            <motion.div 
                initial={{ x: '100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md h-full bg-[#050505] border-l border-white/10 flex flex-col shadow-[-20px_0_100px_rgba(0,0,0,0.8)]"
            >
                <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue">
                            <LayoutDashboard size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tighter italic pr-2">Workspace Hub</h3>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Global Status & Logs</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {/* Workspace Banner - Redesigned for Side Panel */}
                    <div className="relative group overflow-hidden p-8 bg-white/[0.03] border border-white/5 rounded-[3rem]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-3xl pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col gap-8">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse shadow-[0_0_10px_#38b6ff]" />
                                    <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">Operational Parameters</p>
                                </div>
                                <h4 className="text-3xl font-black font-heading uppercase italic tracking-tighter text-white pr-4">Command Center</h4>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {/* Identity Status Card */}
                                <div className={cn("p-6 rounded-[2rem] border flex items-center justify-between group/status transition-all", statusConfig.bg, "border-white/5")}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5", statusConfig.color, "bg-black/40")}>
                                            <statusConfig.icon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Identity Protocol</p>
                                            <p className={cn("text-sm font-black uppercase tracking-wider", statusConfig.color)}>{statusConfig.label}</p>
                                        </div>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover/status:bg-white/40 transition-colors" />
                                </div>

                                {/* Efficiency & Metrics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-black/60 rounded-[2rem] border border-white/5 flex flex-col gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neon-blue">
                                            <Zap size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Efficiency</p>
                                            <p className="text-xl font-black text-white italic">{stats.efficiency}%</p>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-black/60 rounded-[2rem] border border-white/5 flex flex-col gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neon-green">
                                            <Briefcase size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Missions</p>
                                            <p className="text-xl font-black text-white italic">{stats.activeCampaigns}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Deliverables Progress */}
                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Deliverables Sync</p>
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest">{stats.approvedTasks}/{stats.totalTasks}</p>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats.efficiency}%` }}
                                            className="h-full bg-gradient-to-r from-neon-blue to-neon-purple shadow-[0_0_10px_rgba(56,182,255,0.3)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RECENT ACTIVITY LIST */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <History size={16} className="text-gray-600" />
                                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">ACTIVITY LOGS</h3>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {[
                                { title: 'ACCOUNT VERIFIED', date: '5/6/2026', tag: 'SYSTEM', icon: <ShieldCheck size={16} />, color: 'text-neon-green' },
                                { title: 'SECURITY ALERT', date: '4/30/2026', tag: 'AUTH', icon: <AlertCircle size={16} />, color: 'text-neon-blue' },
                                { title: 'TASK UPDATED', date: '4/17/2026', tag: 'DATA', icon: <CheckCircle2 size={16} />, color: 'text-neon-green' }
                            ].map((act, i) => (
                                <div key={i} className="group p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.04] transition-all">
                                    <div className={cn("w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center group-hover:bg-white/5 transition-all shrink-0", act.color)}>
                                        {act.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-black text-white tracking-tight uppercase truncate">{act.title}</h4>
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">
                                            {act.date} • {act.tag}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-black/40">
                    <button onClick={() => window.location.reload()} className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-neon-blue transition-all flex items-center justify-center gap-3 shadow-xl">
                        <RefreshCw size={14} /> Refresh Workspace
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CreatorDashboard;
