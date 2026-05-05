import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { notifySpecificUser, notifyAllUsers } from '../../lib/notificationTriggers';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Megaphone, Plus, Search, MapPin, Edit, Trash2, Users, IndianRupee, Download, Upload, CheckCircle2, Sparkles, LayoutGrid, LayoutDashboard, Target, X, Filter, Globe, Zap, Clock, ChevronRight, Share2, Copy, Image as ImageIcon, GripVertical, Calendar, Star, Link2, FileText, Video, Camera, Eye, ChevronDown, ChevronUp, AlertCircle, XCircle, ExternalLink, Instagram, Youtube, Twitter, Clipboard, ArrowUp, ArrowDown, Mic2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCSV, CSVUploadButton } from '../../components/admin/CSVHandler';
import { cn } from '../../lib/utils';
import LivePreview from '../../components/admin/LivePreview';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioSelect from '../../components/ui/StudioSelect';
import StudioRichEditor from '../../components/ui/StudioRichEditor';

const TASK_TYPES = [
    { value: 'content_post', label: 'Content Post', icon: Camera },
    { value: 'story', label: 'Story', icon: Eye },
    { value: 'reel', label: 'Reel', icon: Video },
    { value: 'visit_event', label: 'Visit Event', icon: MapPin },
    { value: 'custom', label: 'Custom', icon: Star },
];

const PLATFORMS = [
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'youtube', label: 'YouTube', icon: Youtube },
    { value: 'twitter', label: 'Twitter / X', icon: Twitter },
    { value: 'other', label: 'Other', icon: Globe },
];

const getTaskTypeIcon = (type) => {
    const found = TASK_TYPES.find(t => t.value === type);
    return found ? found.icon : Star;
};

const getPlatformIcon = (platform) => {
    const found = PLATFORMS.find(p => p.value === platform);
    return found ? found.icon : Globe;
};

// --- Task Editor Card (used in campaign form) ---
const TaskEditorCard = ({ task, index, totalTasks, onUpdate, onRemove, onMoveUp, onMoveDown, onUploadCreative, isUploading }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleAddCreativeLink = () => {
        const links = task.creativeLinks || [];
        onUpdate(index, 'creativeLinks', [...links, '']);
    };

    const handleCreativeLinkChange = (linkIdx, value) => {
        const links = [...(task.creativeLinks || [])];
        links[linkIdx] = value;
        onUpdate(index, 'creativeLinks', links);
    };

    const handleRemoveCreativeLink = (linkIdx) => {
        const links = [...(task.creativeLinks || [])];
        links.splice(linkIdx, 1);
        onUpdate(index, 'creativeLinks', links);
    };

    const handleRemoveCreativeAsset = (assetIdx) => {
        const assets = [...(task.creativeAssets || [])];
        assets.splice(assetIdx, 1);
        onUpdate(index, 'creativeAssets', assets);
    };

    const TaskTypeIcon = getTaskTypeIcon(task.taskType);
    const PlatformIcon = getPlatformIcon(task.platform);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            layout
            className="bg-black/40 border border-white/5 rounded-[2rem] relative group overflow-hidden"
        >
            {/* Task Priority Strip */}
            <div className={cn(
                "absolute top-0 left-0 w-full h-0.5",
                task.priority === 'required' ? 'bg-neon-blue' : 'bg-white/10'
            )} />

            {/* Collapsed Header */}
            <div
                className="flex items-center gap-4 p-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Reorder + Task Type Badge */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col gap-1">
                        <button type="button" onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} className="text-gray-700 hover:text-white disabled:opacity-20 transition-colors"><ArrowUp size={12} /></button>
                        <button type="button" onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={index === totalTasks - 1} className="text-gray-700 hover:text-white disabled:opacity-20 transition-colors"><ArrowDown size={12} /></button>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center">
                        <TaskTypeIcon size={18} className="text-neon-blue" />
                    </div>
                </div>

                {/* Title + Meta */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <p className="text-[12px] font-black text-white uppercase tracking-tight truncate">
                            {task.title || `Task ${index + 1}`}
                        </p>
                        {task.priority === 'required' && (
                            <span className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/20 rounded-md text-[7px] font-black uppercase tracking-widest text-neon-blue">Required</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <PlatformIcon size={10} className="text-gray-600" />
                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">
                            {PLATFORMS.find(p => p.value === task.platform)?.label || 'Platform'}
                        </span>
                        {task.deadline && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={8} /> {new Date(task.deadline).toLocaleDateString()}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => onRemove()} className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10">
                        <Trash2 size={14} />
                    </button>
                    <ChevronDown size={16} className={cn("text-gray-600 transition-transform duration-300", isExpanded && "rotate-180")} />
                </div>
            </div>

            {/* Expanded Editor */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-8 space-y-6 border-t border-white/5 pt-6">
                            {/* Row 1: Title + Type */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1 space-y-2">
                                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Task Title</label>
                                    <Input required value={task.title} onChange={e => onUpdate(index, 'title', e.target.value)} placeholder="e.g. Instagram Reel" className="h-12 bg-zinc-900/50 border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Task Type</label>
                                    <StudioSelect
                                        value={task.taskType || 'custom'}
                                        options={TASK_TYPES.map(t => ({ value: t.value, label: t.label.toUpperCase() }))}
                                        onChange={val => onUpdate(index, 'taskType', val)}
                                        className="h-12"
                                        accentColor="neon-blue"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Platform</label>
                                    <StudioSelect
                                        value={task.platform || 'instagram'}
                                        options={PLATFORMS.map(p => ({ value: p.value, label: p.label.toUpperCase() }))}
                                        onChange={val => onUpdate(index, 'platform', val)}
                                        className="h-12"
                                        accentColor="neon-blue"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Description */}
                            <StudioRichEditor 
                                label="Execution Details"
                                value={task.description} 
                                onChange={val => onUpdate(index, 'description', val)} 
                                placeholder="Describe what the creator should do..." 
                                minHeight="120px"
                            />

                            {/* Row 3: Deadline + Priority */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">DEADLINE (OPTIONAL)</label>
                                    <StudioDatePicker 
                                        value={task.deadline || ''} 
                                        onChange={val => onUpdate(index, 'deadline', val)} 
                                        className="h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Priority</label>
                                    <div className="flex gap-3 h-12">
                                        <button type="button" onClick={() => onUpdate(index, 'priority', 'required')} className={cn("flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", task.priority === 'required' ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue' : 'bg-zinc-900/50 border-white/5 text-gray-600 hover:text-white')}>
                                            ★ Required
                                        </button>
                                        <button type="button" onClick={() => onUpdate(index, 'priority', 'optional')} className={cn("flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", task.priority === 'optional' ? 'bg-white/5 border-white/20 text-white' : 'bg-zinc-900/50 border-white/5 text-gray-600 hover:text-white')}>
                                            ○ Optional
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Row 4: Caption / Script */}
                            <StudioRichEditor 
                                label="Caption / Script Guidelines"
                                value={task.captionScript || ''} 
                                onChange={val => onUpdate(index, 'captionScript', val)} 
                                placeholder="Provide caption text, hashtags, or talking points..." 
                                minHeight="120px"
                            />

                            {/* Row 5: Creative Assets (uploads) */}
                            <div className="space-y-3">
                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Creative Assets (Images / Videos)</label>
                                <div className="flex flex-wrap gap-3">
                                    {(task.creativeAssets || []).map((url, assetIdx) => (
                                        <div key={assetIdx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 group/asset">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => handleRemoveCreativeAsset(assetIdx)} className="absolute inset-0 bg-black/70 opacity-0 group-hover/asset:opacity-100 transition-opacity flex items-center justify-center">
                                                <XCircle size={16} className="text-red-500" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="w-20 h-20 bg-black/30 border-2 border-dashed border-white/5 hover:border-neon-blue/30 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center group/upload">
                                        <input type="file" className="hidden" accept="image/*,video/*" onChange={e => onUploadCreative(index, e)} />
                                        <Plus size={16} className="text-gray-600 group-hover/upload:text-neon-blue transition-colors" />
                                        <span className="text-[7px] font-bold text-gray-700 mt-1">{isUploading ? 'WAIT...' : 'ADD'}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Row 6: Creative Links */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Reference Links (Drive, Dropbox, etc.)</label>
                                    <button type="button" onClick={handleAddCreativeLink} className="text-[8px] font-black text-neon-blue uppercase tracking-widest hover:text-white transition-colors">+ Add Link</button>
                                </div>
                                <div className="space-y-2">
                                    {(task.creativeLinks || []).map((link, linkIdx) => (
                                        <div key={linkIdx} className="flex gap-2">
                                            <Input value={link} onChange={e => handleCreativeLinkChange(linkIdx, e.target.value)} placeholder="https://drive.google.com/..." className="h-10 flex-1 bg-zinc-900/50 border-white/5 rounded-xl text-[9px] font-bold" />
                                            <button type="button" onClick={() => handleRemoveCreativeLink(linkIdx)} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};


const CampaignManager = () => {
    const { campaigns, addCampaign, updateCampaign, deleteCampaign, user, uploadToCloudinary } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [expandedCampaignId, setExpandedCampaignId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingTaskAsset, setIsUploadingTaskAsset] = useState(false);
    const [modalTab, setModalTab] = useState('applicants'); // applicants | tasks
    const [rejectionModal, setRejectionModal] = useState(null); // { campaignId, taskId, creatorUid }
    const [rejectionReason, setRejectionReason] = useState('');

    const personnelTabs = [
        { name: 'Community', path: '/admin/volunteer-gigs', icon: Users },
        { name: 'Creators', path: '/admin/creators', icon: Star },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
        { name: 'Artistant', path: '/admin/artists', icon: Mic2 },
    ];

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        targetCity: 'Any',
        reward: '',
        requirements: '',
        status: 'Open',
        createdBy: user?.uid || '',
        whatsappLink: '',
        minInstagramFollowers: 0,
        thumbnail: '',
        tasks: []
    });

    const [isProcessingCSV, setIsProcessingCSV] = useState(false);

    const filteredCampaigns = campaigns.filter(c =>
        (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.targetCity || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'Open').length;
    const totalTasksCreated = campaigns.reduce((acc, c) => acc + (c.tasks?.length || 0), 0);
    const totalPendingReviews = campaigns.reduce((acc, c) => {
        return acc + (c.tasks || []).reduce((tAcc, t) => {
            return tAcc + Object.values(t.submissions || {}).filter(sub => sub.status === 'submitted').length;
        }, 0);
    }, 0);

    const resetForm = () => {
        setFormData({ 
            title: '', 
            description: '', 
            targetCity: 'Any', 
            reward: '', 
            requirements: '', 
            status: 'Open', 
            createdBy: user?.uid || '', 
            whatsappLink: '', 
            minInstagramFollowers: 0,
            thumbnail: '',
            tasks: [] 
        });
        setIsCreating(false);
        setEditingId(null);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, thumbnail: url }));
        } catch (error) {
            console.error("Upload failed:", error);
            alert("UPLOAD FAILED. PLEASE TRY AGAIN.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                const oldCampaign = campaigns.find(c => c.id === editingId);
                await updateCampaign(editingId, formData);
                
                // If new tasks added, notify shortlisted creators
                if (formData.tasks.length > (oldCampaign?.tasks?.length || 0)) {
                    const shortlistedCreators = useStore.getState().creators.filter(c => (c.shortlistedCampaigns || []).includes(editingId));
                    for (const creator of shortlistedCreators) {
                        await notifySpecificUser(
                            creator.uid,
                            'CAMPAIGN UPDATE',
                            `NEW TASKS ADDED TO "${formData.title.toUpperCase()}". PLEASE RE-VISIT YOUR STUDIO TO VIEW DETAILS.`,
                            '/creator-dashboard',
                            'campaign'
                        );
                    }
                }
            } else {
                await addCampaign(formData);
                await notifyAllUsers(
                    `NEW CAMPAIGN ACTIVE: ${formData.title.toUpperCase()}`,
                    `REWARD: ${formData.reward}. LOCATION: ${formData.targetCity}. VIEW DETAILS NOW.`,
                    '/campaigns',
                    ''
                );
            }
            resetForm();
        } catch (error) {
            alert("Storage error.");
        }
    };

    const handleEdit = (campaign) => {
        setFormData({ 
            ...campaign, 
            tasks: (campaign.tasks || []).map((t, i) => ({
                ...t,
                taskType: t.taskType || 'custom',
                platform: t.platform || 'instagram',
                deadline: t.deadline || '',
                priority: t.priority || 'required',
                captionScript: t.captionScript || '',
                creativeAssets: t.creativeAssets || [],
                creativeLinks: t.creativeLinks || [],
                submissions: t.submissions || {},
                order: t.order ?? i,
            })),
            minInstagramFollowers: campaign.minInstagramFollowers || 0,
            thumbnail: campaign.thumbnail || ''
        });
        setEditingId(campaign.id);
        setIsCreating(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
            await deleteCampaign(id);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        await updateCampaign(id, { status: currentStatus === 'Open' ? 'Closed' : 'Open' });
    };

    const handleAddTask = () => {
        setFormData({
            ...formData,
            tasks: [...formData.tasks, {
                id: Date.now().toString(),
                title: '',
                description: '',
                taskType: 'custom',
                platform: 'instagram',
                deadline: '',
                priority: 'required',
                captionScript: '',
                creativeAssets: [],
                creativeLinks: [],
                creativeLink: '', // legacy
                submissions: {},
                completedBy: [],
                verifiedBy: [],
                order: formData.tasks.length,
            }]
        });
    };

    const handleTaskChange = (index, field, value) => {
        const newTasks = [...formData.tasks];
        newTasks[index] = { ...newTasks[index], [field]: value };
        setFormData({ ...formData, tasks: newTasks });
    };

    const handleRemoveTask = (index) => {
        const newTasks = [...formData.tasks];
        newTasks.splice(index, 1);
        setFormData({ ...formData, tasks: newTasks });
    };

    const handleMoveTask = (index, direction) => {
        const newTasks = [...formData.tasks];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newTasks.length) return;
        [newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]];
        setFormData({ ...formData, tasks: newTasks });
    };


    const handleUploadTaskCreative = async (taskIndex, e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingTaskAsset(true);
        try {
            const url = await uploadToCloudinary(file);
            const tasks = [...formData.tasks];
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                creativeAssets: [...(tasks[taskIndex].creativeAssets || []), url]
            };
            setFormData({ ...formData, tasks });
        } catch (error) {
            alert("Upload failed");
        } finally {
            setIsUploadingTaskAsset(false);
        }
    };

    const handleCopyLink = (id) => {
        const url = `${window.location.origin}/campaign/${id}`;
        navigator.clipboard.writeText(url);
        alert("Campaign link copied to clipboard!");
    };

    const handleDownloadApplications = (campaign) => {
        const appliedCreators = useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(campaign.id));
        if (appliedCreators.length === 0) {
            alert("No applications yet.");
            return;
        }

        const exportData = appliedCreators.map(c => ({
            UID: c.uid,
            Name: c.name,
            Phone: c.phone,
            City: c.city,
            Specializations: (c.niches || []).join(', '),
            Instagram: c.instagram,
            Followers: c.instagramFollowers || '0',
            Status: c.profileStatus || 'pending'
        }));

        downloadCSV(exportData, `${campaign.title.replace(/\s+/g, '_')}_Applicants`);
    };

    const handleUploadShortlist = async (campaignId, parsedData) => {
        const uploadedUids = parsedData.map(row => row.UID).filter(Boolean);
        if (uploadedUids.length === 0) {
            alert("No UID col found in CSV.");
            return;
        }

        setIsProcessingCSV(true);
        try {
            const appliedCreators = useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(campaignId));
            const approvedUids = appliedCreators.filter(c => uploadedUids.includes(c.uid)).map(c => c.uid);
            if (approvedUids.length > 0) {
                await useStore.getState().bulkShortlistCreators(campaignId, approvedUids, true);
                
                // Notify all newly shortlisted creators
                for (const uid of approvedUids) {
                    await notifySpecificUser(
                        uid,
                        'MISSION SELECTION',
                        `CONGRATULATIONS! YOU HAVE BEEN SELECTED FOR "${campaign.title.toUpperCase()}". VIEW YOUR TASKS IN YOUR CREATOR STUDIO.`,
                        '/creator-dashboard',
                        'campaign'
                    );
                }
            }
            alert(`Shortlisted ${approvedUids.length} creators.`);
        } catch (error) {
            alert("Sync error.");
        } finally {
            setIsProcessingCSV(false);
        }
    };

    const handleToggleShortlist = async (creatorUid) => {
        try {
            if (!expandedCampaignId) return;
            const isShortlisting = !useStore.getState().creators.find(c => c.uid === creatorUid)?.shortlistedCampaigns?.includes(expandedCampaignId);
            await useStore.getState().toggleShortlistStatus(expandedCampaignId, creatorUid);
            
            if (isShortlisting) {
                await notifySpecificUser(
                    creatorUid,
                    'CAMPAIGN SELECTION',
                    `CONGRATULATIONS! YOU HAVE BEEN SELECTED FOR "${expandedCampaign.title.toUpperCase()}". VIEW YOUR TASKS IN YOUR CREATOR STUDIO.`,
                    '/creator-dashboard',
                    'campaign'
                );
            }
        } catch (error) {
            alert("Failed to toggle shortlist.");
        }
    };

    const handleReviewSubmission = async (campaignId, taskId, creatorUid, status) => {
        try {
            if (status === 'rejected') {
                setRejectionModal({ campaignId, taskId, creatorUid });
                return;
            }
            await useStore.getState().reviewTaskSubmission(campaignId, taskId, creatorUid, status);
            
            // Notify creator of approval
            const campaign = campaigns.find(c => c.id === campaignId);
            const task = campaign?.tasks?.find(t => t.id === taskId);
            
            await notifySpecificUser(
                creatorUid,
                'TASK APPROVED',
                `YOUR SUBMISSION FOR "${task?.title?.toUpperCase()}" HAS BEEN VERIFIED. GREAT WORK!`,
                '/creator-dashboard',
                'campaign'
            );
        } catch (error) {
            alert("Review failed.");
        }
    };

    const confirmRejection = async () => {
        if (!rejectionModal) return;
        try {
            await useStore.getState().reviewTaskSubmission(
                rejectionModal.campaignId,
                rejectionModal.taskId,
                rejectionModal.creatorUid,
                'rejected',
                rejectionReason
            );

            // Notify creator of rejection
            const campaign = campaigns.find(c => c.id === rejectionModal.campaignId);
            const task = campaign?.tasks?.find(t => t.id === rejectionModal.taskId);
            
            await notifySpecificUser(
                rejectionModal.creatorUid,
                'TASK FEEDBACK',
                `YOUR SUBMISSION FOR "${task?.title?.toUpperCase()}" REQUIRES ATTENTION: ${rejectionReason.toUpperCase()}`,
                '/creator-dashboard',
                'campaign'
            );

            setRejectionModal(null);
            setRejectionReason('');
        } catch (error) {
            alert("Rejection failed.");
        }
    };

    const expandedCampaign = campaigns.find(c => c.id === expandedCampaignId);
    const appliedCreatorsForExpanded = expandedCampaign 
        ? useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(expandedCampaign.id))
        : [];
    const approvedCreatorsForExpanded = appliedCreatorsForExpanded.filter(c => (c.shortlistedCampaigns || []).includes(expandedCampaignId));

    // Helper: get submission status for a task+creator
    const getSubmissionStatus = (task, creatorUid) => {
        const sub = task.submissions?.[creatorUid];
        if (sub) return sub.status;
        // Legacy fallback
        if ((task.verifiedBy || []).includes(creatorUid)) return 'approved';
        if ((task.completedBy || []).includes(creatorUid)) return 'submitted';
        return 'not_started';
    };

    return (
        <AdminCommunityHubLayout 
            studioHeader={{
                title: "CAMPAIGN",
                subtitle: "WORKSPACE",
                accentClass: "text-neon-blue",
                icon: LayoutDashboard
            }}
            tabs={personnelTabs}
            accentColor="neon-blue"
            action={
                <div className="flex items-center gap-3 px-4 py-2 bg-neon-blue/10 border border-neon-blue/20 rounded-xl relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Sparkles size={14} className="text-neon-blue animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neon-blue">Campaign Workspace Pro</span>
                </div>
            }
        >
            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 py-10">
                {/* Performance Overview Cards */}
                {/* Command Center Stats */}
                {!isCreating && !expandedCampaignId && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                        <div className="p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center relative overflow-hidden group hover:border-neon-blue/20 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 text-gray-500 group-hover:text-white transition-colors">
                                <LayoutGrid size={24} />
                            </div>
                            <span className="text-5xl font-black text-white font-heading italic tracking-tighter truncate w-full">{totalCampaigns}</span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-3">Active Deployments</span>
                        </div>
                        <div className="p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center relative overflow-hidden group hover:border-neon-green/20 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-2xl bg-neon-green/10 flex items-center justify-center mb-6 text-neon-green">
                                <Zap size={24} />
                            </div>
                            <span className="text-5xl font-black text-neon-green font-heading italic tracking-tighter truncate w-full">{activeCampaigns}</span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-3">Live Missions</span>
                        </div>
                        <div className="p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center relative overflow-hidden group hover:border-neon-blue/20 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 flex items-center justify-center mb-6 text-neon-blue">
                                <Target size={24} />
                            </div>
                            <span className="text-5xl font-black text-white font-heading italic tracking-tighter truncate w-full">{totalTasksCreated}</span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-3">Global Segments</span>
                        </div>
                        <div className="p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center relative overflow-hidden group hover:border-yellow-500/20 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-6 text-yellow-500">
                                <Clock size={24} className="animate-pulse" />
                            </div>
                            <span className="text-5xl font-black text-yellow-500 font-heading italic tracking-tighter truncate w-full">{totalPendingReviews}</span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-3">Pending Verification</span>
                        </div>
                    </div>
                )}

                {/* Mode Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 relative z-[100]">
                    <div className="relative flex-1 max-w-md w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="SEARCH CAMPAIGNS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-zinc-900/50 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-neon-blue/30 outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                    {!isCreating && (
                        <Button 
                            onClick={() => { resetForm(); setIsCreating(true); }} 
                            className="h-14 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(46,191,255,0.2)] hover:scale-105 transition-all border-none"
                        >
                            <Plus className="mr-2" size={18} /> New Campaign
                        </Button>
                    )}
                </div>

                <div className="relative z-0">

                {isCreating ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start min-h-[700px] mb-20">
                        {/* Editor Column */}
                        <div className="lg:col-span-7">
                            <Card className="p-8 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem] shadow-2xl">
                                <div className="flex justify-between items-center mb-10">
                                    <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3">
                                        <Sparkles className="text-neon-blue" size={24} /> {editingId ? 'EDIT CAMPAIGN' : 'NEW CAMPAIGN'}
                                    </h2>
                                    <button onClick={resetForm} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Discard</button>
                                </div>
                                
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">CAMPAIGN TITLE</label>
                                            <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Summer Brand Rush" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                        </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Location</label>
                                                <StudioSelect
                                                    value={formData.targetCity}
                                                    options={[
                                                        { value: 'Any', label: 'UNIVERSAL (NATIONAL)' },
                                                        ...PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))
                                                    ]}
                                                    onChange={val => setFormData({ ...formData, targetCity: val })}
                                                    className="h-14"
                                                    accentColor="neon-blue"
                                                />
                                            </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">CAMPAIGN THUMBNAIL</label>
                                        <div className="flex gap-4 items-center">
                                            {formData.thumbnail && (
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                                                    <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <label className="flex-1 h-20 bg-black/30 border-2 border-dashed border-white/5 hover:border-neon-blue/30 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center group">
                                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                                <div className="flex items-center gap-3">
                                                    <ImageIcon size={18} className="text-gray-500 group-hover:text-neon-blue transition-colors" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-white transition-colors">{isUploading ? 'UPLOADING...' : 'Upload Campaign Asset'}</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <StudioRichEditor 
                                        label="BRIEF DESCRIPTION"
                                        required
                                        value={formData.description}
                                        onChange={val => setFormData({ ...formData, description: val })}
                                        placeholder="Describe the campaign requirements and goals..."
                                        minHeight="150px"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">REWARD DETAIL</label>
                                            <Input required value={formData.reward} onChange={e => setFormData({ ...formData, reward: e.target.value })} placeholder="e.g. ₹5,000 + Products" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">MIN INSTAGRAM FOLLOWERS</label>
                                            <Input 
                                                type="number" 
                                                required 
                                                value={formData.minInstagramFollowers} 
                                                onChange={e => setFormData({ ...formData, minInstagramFollowers: parseInt(e.target.value) })} 
                                                placeholder="e.g. 5000" 
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl" 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">WHATSAPP GROUP / HUB LINK</label>
                                        <Input value={formData.whatsappLink} onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                    </div>

                                    {/* === DYNAMIC TASKS SECTION === */}
                                    <div className="pt-10 border-t border-white/5 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                                <div className="w-8 h-px bg-neon-blue" /> MISSION TASKS ({formData.tasks.length})
                                            </h3>
                                            <button type="button" onClick={handleAddTask} className="h-10 px-6 rounded-xl border border-neon-blue/30 text-neon-blue text-[9px] font-black uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all">
                                                + Add Task
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <AnimatePresence mode="popLayout">
                                                {formData.tasks.map((task, index) => (
                                                    <TaskEditorCard
                                                        key={task.id}
                                                        task={task}
                                                        index={index}
                                                        totalTasks={formData.tasks.length}
                                                        onUpdate={handleTaskChange}
                                                        onRemove={() => handleRemoveTask(index)}
                                                        onMoveUp={() => handleMoveTask(index, -1)}
                                                        onMoveDown={() => handleMoveTask(index, 1)}
                                                        onUploadCreative={(idx, e) => handleUploadTaskCreative(idx, e)}
                                                        isUploading={isUploadingTaskAsset}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4 pt-8 mt-10 border-t border-white/10">
                                        <Button type="button" variant="outline" onClick={resetForm} className="h-14 px-10 rounded-2xl border-white/10 text-gray-400">Cancel</Button>
                                        <Button type="submit" className="h-14 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all border-none outline-none">
                                            {editingId ? 'Update Campaign' : 'Create Campaign'}
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </div>

                        {/* Preview Column */}
                        <div className="lg:col-span-5 sticky top-12">
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                    <div className="w-8 h-px bg-white/10" /> LANDING PAGE PREVIEW
                                </h3>
                                <LivePreview type="campaign" data={formData} hideDecorations={true} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex overflow-x-auto lg:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide snap-x snap-mandatory pb-8 md:pb-0">
                        {filteredCampaigns.map((campaign, idx) => {
                            const totalTasks = campaign.tasks?.length || 0;
                            const requiredTasks = (campaign.tasks || []).filter(t => t.priority !== 'optional').length;
                            const applicantsCount = useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(campaign.id)).length;
                            const shortlistedCount = useStore.getState().creators.filter(c => (c.shortlistedCampaigns || []).includes(campaign.id)).length;
                            
                            return (
                                <motion.div 
                                    key={campaign.id} 
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 flex flex-col h-full relative group hover:border-neon-blue/30 transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)] cursor-pointer overflow-hidden" 
                                    onClick={() => { setExpandedCampaignId(campaign.id); setModalTab('applicants'); }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div className={cn(
                                            "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                            campaign.status === 'Open' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        )}>
                                            {campaign.status === 'Open' ? 'Active Mission' : 'Dormant'}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
                                            <button onClick={(e) => { e.stopPropagation(); handleCopyLink(campaign.id); }} className="p-3 bg-white/5 backdrop-blur-md rounded-xl text-gray-500 hover:text-neon-blue transition-colors border border-white/5" title="Copy Public Link"><Share2 size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(campaign); }} className="p-3 bg-white/5 backdrop-blur-md rounded-xl text-gray-500 hover:text-neon-blue transition-colors border border-white/5"><Edit size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id); }} className="p-3 bg-white/5 backdrop-blur-md rounded-xl text-gray-500 hover:text-red-500 transition-colors border border-white/5"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 relative z-10">
                                        <h3 className="text-3xl font-black font-heading mb-4 uppercase italic tracking-tighter text-white group-hover:text-neon-blue transition-colors leading-none pr-10">{campaign.title}</h3>
                                        <div className="flex flex-wrap items-center gap-4 mb-10">
                                            <span className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><MapPin size={12} className="text-neon-blue" /> {campaign.targetCity}</span>
                                            <span className="flex items-center gap-2 text-[10px] font-black text-neon-green uppercase tracking-widest bg-neon-green/5 px-3 py-1.5 rounded-lg border border-neon-green/10"><Zap size={12} /> {campaign.reward}</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] block mb-1">ROSTER</span>
                                                <span className="text-sm font-black text-white italic">{applicantsCount} <span className="text-[10px] text-gray-600 not-italic font-bold">Creators</span></span>
                                            </div>
                                            <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] block mb-1">SELECTED</span>
                                                <span className="text-sm font-black text-neon-blue italic">{shortlistedCount} <span className="text-[10px] text-gray-600 not-italic font-bold">Active</span></span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-auto pt-8 border-t border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue">
                                                    <LayoutDashboard size={18} />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest block">{totalTasks} SEGMENTS</span>
                                                    <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{requiredTasks} CRITICAL REQ</span>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-700 group-hover:text-neon-blue group-hover:bg-neon-blue/10 transition-all">
                                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            
            {/* === EXPANDED CAMPAIGN ANALYTICS MODAL === */}
            <AnimatePresence>
                {expandedCampaign && (
                    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 md:p-6 pt-20 pb-20 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setExpandedCampaignId(null)} />
                        
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="relative bg-zinc-900 border border-white/10 rounded-[3rem] p-0 max-w-6xl w-full max-h-[85vh] md:max-h-[95vh] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col shrink-0">
                            
                            {/* Modal Header */}
                            <div className="p-10 border-b border-white/10 bg-gradient-to-r from-neon-blue/[0.05] to-transparent relative shrink-0">
                                <button onClick={() => setExpandedCampaignId(null)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all z-20 group">
                                    <X size={20} className="group-hover:scale-110 transition-transform" />
                                </button>
                                
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mr-10 pt-2">
                                    <div>
                                        <div className={cn(
                                            "inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border mb-6",
                                            expandedCampaign.status === 'Open' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        )}>
                                            {expandedCampaign.status} Campaign
                                        </div>
                                        <h2 className="text-5xl font-black font-heading tracking-tighter uppercase italic text-white mb-4">{expandedCampaign.title}</h2>
                                        <div className="flex flex-wrap gap-6">
                                            <span className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest"><MapPin size={14} className="text-neon-blue" /> {expandedCampaign.targetCity}</span>
                                            <span className="flex items-center gap-2 text-[11px] font-black text-neon-green uppercase tracking-widest"><IndianRupee size={14} /> {expandedCampaign.reward}</span>
                                            <span className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors cursor-pointer" onClick={() => handleCopyLink(expandedCampaign.id)}><Share2 size={14} /> SHARE BRIEF</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3 shrink-0">
                                        <button
                                            onClick={() => {
                                                handleEdit(expandedCampaign);
                                                setExpandedCampaignId(null);
                                            }}
                                            className="h-12 px-6 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:border-white transition-all text-gray-500 hover:text-white flex items-center gap-2"
                                        >
                                            <Edit size={14} /> Edit
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(expandedCampaign.id, expandedCampaign.status)}
                                            className="h-12 px-6 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:border-white transition-all text-gray-500 hover:text-white"
                                        >
                                            {expandedCampaign.status === 'Open' ? 'Deactivate' : 'Re-activate'}
                                        </button>
                                    </div>
                                </div>

                                {/* Tab Switcher */}
                                <div className="flex gap-2 mt-8 p-1 bg-black/30 rounded-xl w-max border border-white/5">
                                    <button onClick={() => setModalTab('applicants')} className={cn("px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", modalTab === 'applicants' ? 'bg-white text-black' : 'text-gray-500 hover:text-white')}>
                                        <Users size={12} className="inline mr-2" /> Applicants ({appliedCreatorsForExpanded.length})
                                    </button>
                                    <button onClick={() => setModalTab('tasks')} className={cn("px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", modalTab === 'tasks' ? 'bg-white text-black' : 'text-gray-500 hover:text-white')}>
                                        <FileText size={12} className="inline mr-2" /> Tasks & Submissions ({expandedCampaign.tasks?.length || 0})
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-black/20">
                                {modalTab === 'applicants' ? (
                                    /* APPLICANTS TAB */
                                    <div className="space-y-10">
                                        <div className="flex items-center justify-between pb-8 mb-8 border-b border-white/5">
                                            <div>
                                                <h3 className="text-xs font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                                                    <div className="w-8 h-px bg-neon-blue" /> APPLICANT ROSTER
                                                </h3>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 tracking-widest pl-11">Manage selection and campaign onboarding</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => handleDownloadApplications(expandedCampaign)} className="h-12 px-5 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all border border-white/5 gap-3">
                                                    <Download size={16} /> <span className="text-[9px] font-black uppercase tracking-widest">Export CSV</span>
                                                </button>
                                                <CSVUploadButton onUpload={(data) => handleUploadShortlist(expandedCampaign.id, data)} isLoading={isProcessingCSV} className="h-12 px-6 rounded-xl bg-neon-blue/10 text-neon-blue border border-neon-blue/20 text-[9px] font-black uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all" />
                                            </div>
                                        </div>

                                        <div className="space-y-4 pr-4">
                                            {appliedCreatorsForExpanded.length === 0 ? (
                                                <div className="p-10 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/5">
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">No applications received yet.</p>
                                                </div>
                                            ) : (
                                                appliedCreatorsForExpanded.map(creator => (
                                                    <div key={creator.uid} className="flex items-center justify-between p-6 bg-zinc-900/60 border border-white/5 rounded-[2rem] group/asset hover:bg-zinc-900 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-lg group-hover/asset:bg-neon-blue/10 group-hover/asset:text-neon-blue transition-all">
                                                                {(creator.name || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-[13px] text-white uppercase tracking-tight">{creator.name}</p>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <span className={cn(
                                                                        "text-[8px] font-black uppercase tracking-[0.2em]",
                                                                        creator.profileStatus === 'approved' ? 'text-neon-green' : 'text-gray-600'
                                                                    )}>{creator.profileStatus || 'PENDING'}</span>
                                                                    <span className="w-1 h-1 rounded-full bg-gray-800" />
                                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{Number(creator.instagramFollowers || 0).toLocaleString()} FOLLOWERS</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleToggleShortlist(creator.uid); }}
                                                            className={cn(
                                                                "text-[9px] h-10 px-5 font-black uppercase tracking-widest rounded-xl transition-all border",
                                                                (creator.shortlistedCampaigns || []).includes(expandedCampaignId)
                                                                    ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-black'
                                                                    : 'bg-neon-green/10 text-neon-green border-neon-green/20 hover:bg-neon-green hover:text-black'
                                                            )}
                                                        >
                                                            {(creator.shortlistedCampaigns || []).includes(expandedCampaignId) ? 'REVOKE STATUS' : 'SHORTLIST'}
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* TASKS & SUBMISSIONS TAB */
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                                <div className="w-8 h-px bg-neon-green" /> TASK TRACKER
                                            </h3>
                                        </div>
                                        
                                        {(!expandedCampaign.tasks || expandedCampaign.tasks.length === 0) ? (
                                            <div className="p-10 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/5">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">No campaign tasks defined.</p>
                                            </div>
                                        ) : (
                                            expandedCampaign.tasks.map(task => {
                                                const TaskIcon = getTaskTypeIcon(task.taskType);
                                                const PlatIcon = getPlatformIcon(task.platform);
                                                
                                                // Compute per-creator submission statuses
                                                const creatorStatuses = approvedCreatorsForExpanded.map(creator => {
                                                    const status = getSubmissionStatus(task, creator.uid);
                                                    const sub = task.submissions?.[creator.uid];
                                                    return { creator, status, submission: sub };
                                                });

                                                const approvedCount = creatorStatuses.filter(s => s.status === 'approved').length;
                                                const submittedCount = creatorStatuses.filter(s => s.status === 'submitted').length;
                                                const completionRate = approvedCreatorsForExpanded.length > 0 
                                                    ? Math.round((approvedCount / approvedCreatorsForExpanded.length) * 100) 
                                                    : 0;

                                                return (
                                                    <div key={task.id} className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] relative overflow-hidden">
                                                        {/* Progress bar */}
                                                        <div className="absolute top-0 left-0 h-1 bg-neon-green transition-all duration-1000" style={{ width: `${completionRate}%` }} />
                                                        
                                                        {/* Task Header */}
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center">
                                                                    <TaskIcon size={20} className="text-neon-blue" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-3">
                                                                        <h4 className="font-black text-lg text-white uppercase tracking-tight italic">{task.title}</h4>
                                                                        {task.priority === 'required' && (
                                                                            <span className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/20 rounded-md text-[7px] font-black uppercase tracking-widest text-neon-blue">Required</span>
                                                                        )}
                                                                        {task.priority === 'optional' && (
                                                                            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[7px] font-black uppercase tracking-widest text-gray-500">Optional</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <PlatIcon size={10} className="text-gray-500" />
                                                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{PLATFORMS.find(p => p.value === task.platform)?.label || 'Platform'}</span>
                                                                        {task.deadline && (
                                                                            <>
                                                                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                                                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Due {new Date(task.deadline).toLocaleDateString()}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className="text-[9px] px-3 py-1 bg-white/5 rounded-full text-neon-green font-black uppercase tracking-widest border border-neon-green/20">{completionRate}% COMPLETE</span>
                                                        </div>

                                                        {task.description && (
                                                            <p className="text-[11px] font-medium text-gray-500 mb-6 border-l border-white/10 pl-4">{task.description}</p>
                                                        )}

                                                        {/* Per-creator submissions */}
                                                        <div className="space-y-3 mt-6 pt-6 border-t border-white/5">
                                                            <p className="text-[8px] uppercase font-black text-gray-500 tracking-[0.3em] mb-4">Creator Submissions ({approvedCreatorsForExpanded.length} shortlisted)</p>
                                                            
                                                            {approvedCreatorsForExpanded.length === 0 ? (
                                                                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">NO SHORTLISTED CREATORS YET</span>
                                                            ) : (
                                                                creatorStatuses.map(({ creator, status, submission }) => (
                                                                    <div key={creator.uid} className={cn(
                                                                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                                                        status === 'approved' ? 'bg-neon-green/5 border-neon-green/10' :
                                                                        status === 'submitted' ? 'bg-yellow-500/5 border-yellow-500/10' :
                                                                        status === 'rejected' ? 'bg-red-500/5 border-red-500/10' :
                                                                        'bg-white/[0.02] border-white/5'
                                                                    )}>
                                                                        {/* Creator Profile & Status */}
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-black text-neon-blue shadow-[0_0_20px_rgba(46,191,255,0.05)]">
                                                                                {(creator.name || 'U')[0].toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[12px] font-black text-white uppercase tracking-tight leading-none mb-1">{creator.name}</p>
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className={cn(
                                                                                        "px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border",
                                                                                        status === 'approved' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' :
                                                                                        status === 'submitted' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/10' :
                                                                                        status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/10' :
                                                                                        'bg-white/5 text-gray-600 border-white/5'
                                                                                    )}>
                                                                                        {status === 'not_started' ? 'Pending Action' : status.toUpperCase()}
                                                                                    </span>
                                                                                    {submission?.contentLink && (
                                                                                        <a href={submission.contentLink} target="_blank" rel="noopener noreferrer" className="text-[8px] text-neon-blue font-black uppercase tracking-widest hover:text-white flex items-center gap-1.5 transition-colors">
                                                                                            <ExternalLink size={10} /> Link
                                                                                        </a>
                                                                                    )}
                                                                                    {submission?.proofUrl && (
                                                                                        <a href={submission.proofUrl} target="_blank" rel="noopener noreferrer" className="text-[8px] text-neon-blue font-black uppercase tracking-widest hover:text-white flex items-center gap-1.5 transition-colors">
                                                                                            <ImageIcon size={10} /> Proof
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Actions & Feedback */}
                                                                        <div className="flex items-center gap-4">
                                                                            {status === 'rejected' && submission?.rejectionReason && (
                                                                                <div className="max-w-[180px] text-right hidden md:block">
                                                                                    <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-0.5">Note</p>
                                                                                    <p className="text-[10px] text-gray-500 italic truncate" title={submission.rejectionReason}>{submission.rejectionReason}</p>
                                                                                </div>
                                                                            )}

                                                                            {status === 'submitted' && (
                                                                                <div className="flex gap-2">
                                                                                    <button onClick={() => handleReviewSubmission(expandedCampaign.id, task.id, creator.uid, 'approved')} className="w-10 h-10 bg-neon-green/10 hover:bg-neon-green text-neon-green hover:text-black rounded-xl transition-all flex items-center justify-center shadow-lg" title="Verify Submission">
                                                                                        <CheckCircle2 size={16} />
                                                                                    </button>
                                                                                    <button onClick={() => handleReviewSubmission(expandedCampaign.id, task.id, creator.uid, 'rejected')} className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center shadow-lg" title="Flag submission">
                                                                                        <XCircle size={16} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            {status === 'approved' && (
                                                                                <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green border border-neon-green/20">
                                                                                    <CheckCircle2 size={18} />
                                                                                </div>
                                                                            )}
                                                                            {status === 'rejected' && (
                                                                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                                                                    <XCircle size={18} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rejection Reason Modal */}
            <AnimatePresence>
                {rejectionModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80" onClick={() => setRejectionModal(null)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                                <AlertCircle className="text-red-500" size={20} /> Rejection Reason
                            </h3>
                            <textarea
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Provide feedback to the creator..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-red-500 h-28 resize-none mb-6"
                            />
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setRejectionModal(null)} className="rounded-xl border-white/10 text-gray-400">Cancel</Button>
                                <Button onClick={confirmRejection} className="rounded-xl bg-red-500 text-white border-none hover:bg-red-600">Confirm Rejection</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default CampaignManager;
