import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Gift from 'lucide-react/dist/esm/icons/gift';
import { notifySpecificUser, notifyAllUsers } from '../../lib/notificationTriggers';
import { PREDEFINED_CITIES, isCampaignCityMatch } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Users from 'lucide-react/dist/esm/icons/users';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import Download from 'lucide-react/dist/esm/icons/download';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Target from 'lucide-react/dist/esm/icons/target';
import X from 'lucide-react/dist/esm/icons/x';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Clock from 'lucide-react/dist/esm/icons/clock';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Star from 'lucide-react/dist/esm/icons/star';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Video from 'lucide-react/dist/esm/icons/video';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Eye from 'lucide-react/dist/esm/icons/eye';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Clipboard from 'lucide-react/dist/esm/icons/clipboard';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Layers from 'lucide-react/dist/esm/icons/layers';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Check from 'lucide-react/dist/esm/icons/check';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Flame from 'lucide-react/dist/esm/icons/flame';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import ArrowUpDown from 'lucide-react/dist/esm/icons/arrow-up-down';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Phone from 'lucide-react/dist/esm/icons/phone';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import CreatorDetailModal from '../../components/admin/CreatorDetailModal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

import { cn, getCampaignSpotsInfo, normalizePhoneNumber } from '../../lib/utils';
import LivePreview from '../../components/admin/LivePreview';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioSelect from '../../components/ui/StudioSelect';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import CampaignList from '../../components/admin/creatorPortal/CampaignList';
import { buildCampaignUrl, creatorCampaignPath, findCampaignById } from '../../lib/campaignLinks';
import { copyToClipboard } from '../../lib/clipboard';

const TASK_TYPES = [
    { value: 'content_post', label: 'Content Post', icon: Camera },
    { value: 'story', label: 'Story', icon: Eye },
    { value: 'reel', label: 'Reel', icon: Video },
    { value: 'visit_event', label: 'Visit Event', icon: MapPin },
    { value: 'custom', label: 'Custom', icon: Layers },
];

const PLATFORMS = [
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'youtube', label: 'YouTube', icon: Youtube },
    { value: 'twitter', label: 'Twitter / X', icon: Twitter },
    { value: 'other', label: 'Other', icon: Globe },
];

const getTaskTypeIcon = (type) => {
    const found = TASK_TYPES.find(t => t.value === type);
    return found ? found.icon : Layers;
};

const getPlatformIcon = (platform) => {
    const found = PLATFORMS.find(p => p.value === platform);
    return found ? found.icon : Globe;
};

/* --- Redesigned Sub-components --- */

const StatusPill = ({ status }) => {
    const config = {
        Open: "bg-black/75 dark:bg-black/80 text-emerald-400 dark:text-neon-green border-emerald-500/40 dark:border-neon-green/40 shadow-sm",
        Closed: "bg-black/75 dark:bg-black/80 text-red-400 border-red-500/40 shadow-sm",
        Archive: "bg-black/75 dark:bg-black/80 text-gray-400 border-gray-500/40 shadow-sm"
    };
    const style = config[status] || config.Open;
    return (
        <span className={cn("px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border backdrop-blur-md font-mono shadow-xs", style)}>
            {status || 'OPEN'}
        </span>
    );
};

const CampaignManager = () => {
    useStoreSubscription(['campaigns', 'creators']);
    const { campaigns, creators, addCampaign, updateCampaign, deleteCampaign, user, uploadToCloudinary } = useStore();
    const campaignsLoaded = useStore(state => Boolean(state.subscriptionsLoaded?.campaigns));
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const isCreating = location.pathname.endsWith('/create') || location.pathname.includes('/edit/');
    const editingId = location.pathname.includes('/edit/') ? params.id : null;
    const expandedCampaignId = location.pathname.includes('/manage/') ? params.id : null;
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingBrandLogo, setIsUploadingBrandLogo] = useState(false);
    const [isUploadingTaskAsset, setIsUploadingTaskAsset] = useState(false);
    const [modalTab, setModalTab] = useState('applicants'); 
    const [rejectionModal, setRejectionModal] = useState(null); 
    const [rejectionReason, setRejectionReason] = useState('');
    const [isDeploying, setIsDeploying] = useState(false);
    const [isProcessingTask, setIsProcessingTask] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);


    const [formData, setFormData] = useState({
        title: '',
        brand: '',
        brandLogo: '',
        totalSpots: '',
        spotsLeft: '',
        description: '',
        targetCity: 'Any',
        reward: '',
        requirements: '',
        status: 'Open',
        createdBy: user?.uid || '',
        whatsappLink: '',
        minInstagramFollowers: 0,
        autoShortlistEligible: true,
        thumbnail: '',
        tasks: [],
        isPinned: false
    });



    useEffect(() => {
        if (editingId && campaigns.length > 0) {
            const campaign = findCampaignById(campaigns, editingId);
            if (campaign) {
                // Load once per campaign. Later listener snapshots (e.g. a creator
                // submitting a task) must not wipe edits the admin is making.
                setFormData(prev => prev.id === campaign.id ? prev : { 
                    ...campaign, 
                    brand: campaign.brand || '',
                    brandLogo: campaign.brandLogo || '',
                    totalSpots: campaign.totalSpots !== undefined && campaign.totalSpots !== null ? String(campaign.totalSpots) : '',
                    spotsLeft: campaign.spotsLeft !== undefined && campaign.spotsLeft !== null ? String(campaign.spotsLeft) : '',
                    targetCollege: campaign.targetCollege || 'Any',
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
                    autoShortlistEligible: campaign.autoShortlistEligible ?? true,
                    thumbnail: campaign.thumbnail || '',
                    isPinned: campaign.isPinned || false
                });
            }
        }
    }, [editingId, campaigns]);

    const resetForm = () => {
        setFormData({ 
            title: '', 
            brand: '',
            brandLogo: '',
            totalSpots: '',
            spotsLeft: '',
            description: '', 
            targetCity: 'Any', 
            targetCollege: 'Any',
            reward: '', 
            requirements: '', 
            status: 'Open', 
            createdBy: user?.uid || '', 
            whatsappLink: '', 
            minInstagramFollowers: 0,
            autoShortlistEligible: true,
            thumbnail: '',
            tasks: [],
            isPinned: false
        });
        navigate('/admin/campaigns');
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, thumbnail: url }));
        } catch (error) {
            useStore.getState().addToast("Couldn't upload the image. Please try again.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleBrandLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingBrandLogo(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, brandLogo: url }));
            useStore.getState().addToast("Brand logo uploaded!", 'success');
        } catch (error) {
            useStore.getState().addToast("Couldn't upload brand logo. Please try again.", 'error');
        } finally {
            setIsUploadingBrandLogo(false);
        }
    };

    const handleBrandLogoPaste = async (e) => {
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!items) return;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                setIsUploadingBrandLogo(true);
                try {
                    const url = await uploadToCloudinary(file);
                    setFormData(prev => ({ ...prev, brandLogo: url }));
                    useStore.getState().addToast("Brand logo pasted from clipboard!", 'success');
                } catch (error) {
                    useStore.getState().addToast("Couldn't upload the pasted logo.", 'error');
                } finally {
                    setIsUploadingBrandLogo(false);
                }
                e.preventDefault();
                break;
            }
        }
    };

    const handlePaste = async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                setIsUploading(true);
                try {
                    const url = await uploadToCloudinary(file);
                    setFormData(prev => ({ ...prev, thumbnail: url }));
                    useStore.getState().addToast("Image pasted from clipboard!", 'success');
                } catch (error) {
                    useStore.getState().addToast("Couldn't upload the pasted image. Please try again.", 'error');
                } finally {
                    setIsUploading(false);
                }
                e.preventDefault();
            }
        }
    };

    // When editing, the form is only safe to save once it holds the campaign's data.
    // Saving earlier would overwrite the campaign with an empty form.
    const isEditFormReady = !editingId || Boolean(formData.id && findCampaignById([formData], editingId));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEditFormReady) return;
        setIsDeploying(true);
        try {
            if (editingId) {
                // Keep submissions that arrived while the form was open; the form
                // only holds the snapshot from when editing started.
                const live = findCampaignById(campaigns, editingId);
                const liveTasks = new Map((live?.tasks || []).map(t => [t.id, t]));
                const payload = {
                    ...formData,
                    tasks: (formData.tasks || []).map(t => {
                        const liveTask = liveTasks.get(t.id);
                        return liveTask?.submissions ? { ...t, submissions: { ...(t.submissions || {}), ...liveTask.submissions } } : t;
                    }),
                };
                await updateCampaign(editingId, payload);
            } else {
                const newCampaignId = await addCampaign(formData);
                await notifyAllUsers(
                    `NEW CAMPAIGN ACTIVE: ${formData.title.toUpperCase()}`,
                    `REWARD: ${formData.reward}. LOCATION: ${formData.targetCity}. VIEW DETAILS NOW.`,
                    newCampaignId ? `/campaign/${newCampaignId}` : '/creator-dashboard',
                    ''
                );
            }
            resetForm();
        } catch (error) {
            console.error("Failed to save campaign:", error);
            useStore.getState().addToast(`Storage error: ${error.message || error}`, 'error');
        } finally {
            setIsDeploying(false);
        }
    };

    const handleEdit = (campaign) => {
        navigate(`/admin/campaigns/edit/${campaign.id}`);
    };

    const handleCopyLink = (id) => {
        const url = buildCampaignUrl(id);
        copyToClipboard(url);
        useStore.getState().addToast("Campaign link copied to clipboard!", 'success');
    };

    const handleCopyTaskLink = (campaignId, taskId) => {
        const url = buildCampaignUrl(campaignId, taskId);
        copyToClipboard(url);
        useStore.getState().addToast("Task link copied to clipboard!", 'success');
    };

    const handleToggleShortlist = async (creatorUid, campaignId) => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            const isShortlisting = !useStore.getState().creators.find(c => c.uid === creatorUid)?.shortlistedCampaigns?.includes(campaignId);
            await useStore.getState().toggleShortlistStatus(campaignId, creatorUid);
            
            if (isShortlisting) {
                const campaign = campaigns.find(c => c.id === campaignId);
                await notifySpecificUser(
                    creatorUid,
                    'CAMPAIGN SELECTION',
                    `CONGRATULATIONS! YOU HAVE BEEN SELECTED FOR "${campaign.title.toUpperCase()}". VIEW YOUR TASKS IN YOUR CREATOR STUDIO.`,
                    creatorCampaignPath(campaignId),
                    'campaign'
                );
            }
        } catch (error) {
            useStore.getState().addToast("Failed to toggle shortlist.", 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAutoShortlist = async (campaignId, eligibleUids) => {
        if (isUpdating || !eligibleUids || eligibleUids.length === 0) return;
        setIsUpdating(true);
        try {
            await useStore.getState().bulkShortlistCreators(campaignId, eligibleUids, true);
            const campaign = campaigns.find(c => c.id === campaignId);
            
            // Notify each shortlisted creator
            await Promise.allSettled(
                eligibleUids.map(uid => 
                    notifySpecificUser(
                        uid,
                        'CAMPAIGN SELECTION',
                        `CONGRATULATIONS! YOU HAVE BEEN SELECTED FOR "${(campaign?.title || 'CAMPAIGN').toUpperCase()}". VIEW YOUR TASKS IN YOUR CREATOR STUDIO.`,
                        creatorCampaignPath(campaignId),
                        'campaign'
                    )
                )
            );
            useStore.getState().addToast(`Auto-shortlisted ${eligibleUids.length} qualifying creator${eligibleUids.length === 1 ? '' : 's'}!`, 'success');
        } catch (error) {
            console.error("Auto shortlist error:", error);
            useStore.getState().addToast("Failed to auto-shortlist creators.", 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleAutoShortlistCampaign = async (campaignId) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        const nextVal = !campaign.autoShortlistEligible;
        try {
            await updateCampaign(campaignId, { autoShortlistEligible: nextVal });
            useStore.getState().addToast(
                nextVal 
                    ? "Auto-shortlist on apply enabled for this campaign!" 
                    : "Auto-shortlist on apply disabled.", 
                'info'
            );
        } catch (err) {
            useStore.getState().addToast("Failed to toggle auto-shortlist setting.", 'error');
        }
    };

    const handleDeleteCampaign = async (id) => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await deleteCampaign(id);
            if (expandedCampaignId === id) {
                navigate('/admin/campaigns');
            }
        } catch (error) {
            useStore.getState().addToast("Failed to delete campaign.", 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateCampaignStatus = async (id, updatedData) => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await updateCampaign(id, updatedData);
        } catch (error) {
            useStore.getState().addToast("Failed to update status.", 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateTask = React.useCallback((idx, field, val) => {
        setFormData(prev => {
            const newTasks = [...prev.tasks];
            newTasks[idx] = { ...newTasks[idx], [field]: val };
            return { ...prev, tasks: newTasks };
        });
    }, []);

    const handleRemoveTask = React.useCallback((index) => {
        setFormData(prev => {
            const newTasks = [...prev.tasks];
            newTasks.splice(index, 1);
            return { ...prev, tasks: newTasks };
        });
    }, []);

    const handleMoveTaskUp = React.useCallback((index) => {
        if (index === 0) return;
        setFormData(prev => {
            const newTasks = [...prev.tasks];
            [newTasks[index], newTasks[index-1]] = [newTasks[index-1], newTasks[index]];
            return { ...prev, tasks: newTasks };
        });
    }, []);

    const handleMoveTaskDown = React.useCallback((index) => {
        setFormData(prev => {
            if (index === prev.tasks.length - 1) return prev;
            const newTasks = [...prev.tasks];
            [newTasks[index], newTasks[index+1]] = [newTasks[index+1], newTasks[index]];
            return { ...prev, tasks: newTasks };
        });
    }, []);

    const handleUploadTaskCreative = React.useCallback(async (idx, e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingTaskAsset(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => {
                const tasks = [...prev.tasks];
                tasks[idx] = { ...tasks[idx], creativeAssets: [...(tasks[idx].creativeAssets || []), url] };
                return { ...prev, tasks };
            });
        } catch (err) {
            useStore.getState().addToast("Upload failed", 'error');
        } finally {
            setIsUploadingTaskAsset(false);
        }
    }, [uploadToCloudinary]);

    const handleReviewSubmission = async (campaignId, taskId, creatorUid, status) => {
        setIsReviewing(true);
        try {
            if (status === 'rejected') {
                setRejectionModal({ campaignId, taskId, creatorUid });
                setIsReviewing(false); // Modal takes over
                return;
            }
            await useStore.getState().reviewTaskSubmission(campaignId, taskId, creatorUid, status);
            
            const campaign = campaigns.find(c => c.id === campaignId);
            const task = campaign?.tasks?.find(t => t.id === taskId);
            
            await notifySpecificUser(
                creatorUid,
                'TASK APPROVED',
                `YOUR SUBMISSION FOR "${task?.title?.toUpperCase()}" HAS BEEN VERIFIED. GREAT WORK!`,
                creatorCampaignPath(campaignId),
                'campaign'
            );
        } catch (error) {
            useStore.getState().addToast("Review failed.", 'error');
        } finally {
            setIsReviewing(false);
        }
    };

    const confirmRejection = async () => {
        if (!rejectionModal) return;
        setIsReviewing(true);
        try {
            await useStore.getState().reviewTaskSubmission(
                rejectionModal.campaignId,
                rejectionModal.taskId,
                rejectionModal.creatorUid,
                'rejected',
                rejectionReason
            );

            const campaign = campaigns.find(c => c.id === rejectionModal.campaignId);
            const task = campaign?.tasks?.find(t => t.id === rejectionModal.taskId);
            
            await notifySpecificUser(
                rejectionModal.creatorUid,
                'TASK FEEDBACK',
                `YOUR SUBMISSION FOR "${task?.title?.toUpperCase()}" REQUIRES ATTENTION: ${rejectionReason.toUpperCase()}`,
                creatorCampaignPath(rejectionModal.campaignId),
                'campaign'
            );

            setRejectionModal(null);
            setRejectionReason('');
        } catch (error) {
            useStore.getState().addToast("Rejection failed.", 'error');
        } finally {
            setIsReviewing(false);
        }
    };

    const renderContent = () => (
        <div className="relative z-10 pb-20">
            <div>
                {/* Main Content Area */}
                <div className="relative min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {isCreating ? (
                            <motion.div
                                key="editor"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                className="max-w-6xl mx-auto"
                            >
                                <div className="mb-6 flex flex-col gap-4 font-sans md:flex-row md:items-end md:justify-between">
                                    <div>
                                        <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400">
                                            <button type="button" onClick={resetForm} className="hover:text-gray-900 hover:underline dark:hover:text-white">Campaigns</button>
                                            <span>/</span>
                                            <span className="text-gray-900 dark:text-white">{editingId ? 'Edit' : 'New'}</span>
                                        </nav>
                                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                            {editingId ? (formData.title || 'Edit campaign') : 'New campaign'}
                                        </h2>
                                    </div>
                                    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-end gap-2 border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                                        {editingId && !isEditFormReady && (
                                            <span className="mr-auto text-sm text-gray-500 dark:text-zinc-400 md:mr-2">Loading campaign…</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="inline-flex h-9 items-center rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isDeploying || isUploading || !isEditFormReady}
                                            className="inline-flex h-9 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                                        >
                                            {isDeploying ? <LoadingSpinner size="sm" color="currentColor" /> : (editingId ? 'Save changes' : 'Create campaign')}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    <div className="lg:col-span-7 space-y-6">
                                        <Card className="p-0 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl shadow-sm dark:shadow-none overflow-hidden">
                                            {/* Section 1: Brand Identity */}
                                            <div className="p-6 md:p-8 space-y-6">
                                                <div className="flex items-center gap-3 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                                                    <div className="w-8 h-8 rounded-full bg-neon-green/10 flex items-center justify-center">
                                                        <Briefcase size={16} className="text-neon-green" />
                                                    </div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Brand Identity</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">BRAND NAME</label>
                                                        <Input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g. Red Bull, Nike, Spotify" className="w-full h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">BRAND LOGO (OR CTRL+V)</label>
                                                        <div className="flex gap-3 items-center">
                                                            {formData.brandLogo && (
                                                                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shrink-0 bg-white dark:bg-zinc-800 p-1 flex items-center justify-center group/logo">
                                                                    <img src={formData.brandLogo} alt="Logo" className="w-full h-full object-contain" />
                                                                    <button type="button" onClick={() => setFormData({ ...formData, brandLogo: '' })} className="absolute inset-0 bg-black/70 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity" title="Remove logo">✕</button>
                                                                </div>
                                                            )}
                                                            <div className="flex-1 flex gap-2">
                                                                <Input value={formData.brandLogo} onChange={e => setFormData({ ...formData, brandLogo: e.target.value })} onPaste={handleBrandLogoPaste} placeholder="LOGO URL OR PASTE" className="flex-1 h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                                <label className="w-14 h-14 bg-white dark:bg-black/40 border-2 border-dashed border-black/[0.1] dark:border-white/[0.08] hover:border-neon-green/80 rounded-xl transition-all cursor-pointer flex items-center justify-center group shrink-0" title="Upload Brand Logo">
                                                                    <input type="file" className="hidden" onChange={handleBrandLogoChange} accept="image/*" />
                                                                    {isUploadingBrandLogo ? <LoadingSpinner size="xs" color="#39ff14" /> : <Upload size={18} className="text-gray-400 group-hover:text-neon-green transition-colors" />}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 2: Campaign Info */}
                                            <div className="p-6 md:p-8 space-y-6 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.05] dark:border-white/[0.05]">
                                                <div className="flex items-center gap-3 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                                                    <div className="w-8 h-8 rounded-full bg-neon-green/10 flex items-center justify-center">
                                                        <FileText size={16} className="text-neon-green" />
                                                    </div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Campaign Info</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">TITLE</label>
                                                        <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Summer Brand Rush" className="w-full h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">Target Location</label>
                                                        <StudioSelect value={formData.targetCity} options={[{ value: 'Any', label: 'UNIVERSAL (NATIONAL)' }, ...PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))]} onChange={val => setFormData({ ...formData, targetCity: val })} className="h-14 border-black/[0.1] dark:border-white/[0.08] rounded-xl text-sm bg-white dark:bg-black/40" accentColor="neon-green" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">Target College / University</label>
                                                    <Input value={formData.targetCollege} onChange={e => setFormData({ ...formData, targetCollege: e.target.value })} placeholder="e.g. Delhi University, IIT (or 'Any' for all colleges)" className="w-full h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                </div>
                                            </div>

                                            {/* Section 3: Campaign Media */}
                                            <div className="p-6 md:p-8 space-y-6 border-t border-black/[0.05] dark:border-white/[0.05]">
                                                <div className="flex items-center gap-3 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                                                    <div className="w-8 h-8 rounded-full bg-neon-green/10 flex items-center justify-center">
                                                        <ImageIcon size={16} className="text-neon-green" />
                                                    </div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Campaign Media</h3>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">CAMPAIGN IMAGE (OR CTRL+V)</label>
                                                    <div className="flex gap-3 items-center">
                                                        {formData.thumbnail && (
                                                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shrink-0">
                                                                <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 flex gap-3">
                                                            <Input value={formData.thumbnail} onChange={e => setFormData({ ...formData, thumbnail: e.target.value })} onPaste={handlePaste} placeholder="ASSET URL OR PASTE IMAGE" className="flex-1 h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                            <label className="w-14 h-14 bg-white dark:bg-black/40 border-2 border-dashed border-black/[0.1] dark:border-white/[0.08] hover:border-neon-green/80 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center group shrink-0">
                                                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                                                <ImageIcon size={18} className="text-gray-400 group-hover:text-neon-green transition-colors" />
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <StudioRichEditor label="DESCRIPTION" required value={formData.description} onChange={val => setFormData({ ...formData, description: val })} placeholder="Describe the campaign requirements and goals..." minHeight="180px" />
                                            </div>

                                            {/* Section 4: Compensation & Reach */}
                                            <div className="p-6 md:p-8 space-y-6 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.05] dark:border-white/[0.05]">
                                                <div className="flex items-center gap-3 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                                                    <div className="w-8 h-8 rounded-full bg-neon-green/10 flex items-center justify-center">
                                                        <Gift size={16} className="text-neon-green" />
                                                    </div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Compensation & Reach</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">REWARDS</label>
                                                        <Input required value={formData.reward} onChange={e => setFormData({ ...formData, reward: e.target.value })} placeholder="e.g. ₹5,000 + Products" className="w-full h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">MINIMUM FOLLOWERS</label>
                                                        <Input type="number" required value={formData.minInstagramFollowers} onChange={e => setFormData({ ...formData, minInstagramFollowers: parseInt(e.target.value) })} placeholder="e.g. 5000" className="w-full h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">TOTAL SPOTS</label>
                                                        <Input type="number" min="0" value={formData.totalSpots} onChange={e => setFormData({ ...formData, totalSpots: e.target.value })} placeholder="e.g. 50 (or leave blank for unlimited)" className="w-full h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">SPOTS LEFT (OVERRIDE)</label>
                                                        <Input type="number" min="0" value={formData.spotsLeft} onChange={e => setFormData({ ...formData, spotsLeft: e.target.value })} placeholder={formData.totalSpots ? `Auto-calculated (${Math.max(0, Number(formData.totalSpots) - (editingId ? (creators.filter(c => (c.joinedCampaigns || []).includes(editingId)).length) : 0))} left)` : "Auto-calculated if blank"} className="w-full h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 5: Settings */}
                                            <div className="p-6 md:p-8 space-y-6 border-t border-black/[0.05] dark:border-white/[0.05]">
                                                <div className="flex items-center gap-3 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                                                    <div className="w-8 h-8 rounded-full bg-neon-green/10 flex items-center justify-center">
                                                        <Settings size={16} className="text-neon-green" />
                                                    </div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Settings</h3>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1.5">WHATSAPP GROUP LINK</label>
                                                    <Input value={formData.whatsappLink} onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." className="w-full h-14 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                                </div>
                                                <div className={cn("p-5 rounded-2xl border flex items-center justify-between transition-all duration-300", formData.autoShortlistEligible ? "bg-neon-green/5 border-neon-green/30" : "bg-white dark:bg-black/40 border-black/[0.08] dark:border-white/[0.08]")}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300", formData.autoShortlistEligible ? "bg-neon-green text-black" : "bg-black/5 dark:bg-white/5 text-gray-500")}>
                                                            <Zap size={18} className={cn(formData.autoShortlistEligible && "fill-current")} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-gray-900 dark:text-white text-sm font-black uppercase tracking-widest italic leading-tight">AUTO-SHORTLIST ON APPLY</h4>
                                                            <p className="text-[10px] text-gray-500 mt-0.5 uppercase font-bold tracking-widest">AUTO-APPROVE CREATORS WHO MEET FOLLOWER CRITERIA</p>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => setFormData({ ...formData, autoShortlistEligible: !formData.autoShortlistEligible })} className={cn("w-12 h-6 rounded-full relative transition-all border", formData.autoShortlistEligible ? "bg-neon-green border-neon-green" : "bg-white dark:bg-black/40 border-black/10 dark:border-white/10")}>
                                                        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm", formData.autoShortlistEligible ? "right-1 bg-black" : "left-1 bg-gray-400")} />
                                                    </button>
                                                </div>
                                                <div className={cn("p-5 rounded-2xl border flex items-center justify-between transition-all duration-300", formData.isPinned ? "bg-neon-green/5 border-neon-green/30" : "bg-white dark:bg-black/40 border-black/[0.08] dark:border-white/[0.08]")}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300", formData.isPinned ? "bg-neon-green text-black" : "bg-black/5 dark:bg-white/5 text-gray-500")}>
                                                            <Star size={18} className={cn(formData.isPinned && "fill-current")} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-gray-900 dark:text-white text-sm font-black uppercase tracking-widest italic leading-tight">PIN TO TOP</h4>
                                                            <p className="text-[10px] text-gray-500 mt-0.5 uppercase font-bold tracking-widest">SHOW AT THE TOP OF THE LIST</p>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })} className={cn("w-12 h-6 rounded-full relative transition-all border", formData.isPinned ? "bg-neon-green border-neon-green" : "bg-white dark:bg-black/40 border-black/10 dark:border-white/10")}>
                                                        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm", formData.isPinned ? "right-1 bg-black" : "left-1 bg-gray-400")} />
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-32 h-fit">
                                        <LivePreview type="campaign" data={formData} />
                                        <Card className="p-0 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl shadow-sm dark:shadow-none overflow-hidden">
                                            <div className="p-5 md:p-6 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.05] dark:border-white/[0.05]">
                                                <div className="flex items-center justify-between mb-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-neon-green/10 flex items-center justify-center">
                                                            <Zap size={16} className="text-neon-green" />
                                                        </div>
                                                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                                                            Deliverables
                                                            <span className="bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white px-2 py-0.5 rounded-full text-[10px] font-mono">
                                                                {formData.tasks.length}
                                                            </span>
                                                        </h3>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev, 
                                                            tasks: [...prev.tasks, { 
                                                                id: Date.now().toString(), 
                                                                title: `Deliverable ${prev.tasks.length + 1}`, 
                                                                description: '', 
                                                                taskType: 'custom', 
                                                                platform: 'instagram', 
                                                                priority: 'required', 
                                                                googleFormLink: '',
                                                                googleFormLabel: '',
                                                                ticketLink: '',
                                                                ticketLabel: '',
                                                                creativeLink: '',
                                                                creativeLabel: '',
                                                                referencePostUrl: '',
                                                                referencePostLabel: '',
                                                                taskLinks: [],
                                                                creativeAssets: [], 
                                                                creativeLinks: [], 
                                                                submissions: {} 
                                                            }] 
                                                        }))} 
                                                        className="col-span-3 h-11 rounded-xl bg-neon-green text-black font-black uppercase tracking-widest text-[11px] hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(57,255,20,0.2)] active:scale-95"
                                                    >
                                                        <Plus size={14} className="stroke-[3]" />
                                                        <span>Add Custom Deliverable</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const count = formData.tasks.filter(t => t.taskType === 'story' || (t.title || '').toLowerCase().includes('story')).length + 1;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                tasks: [...prev.tasks, {
                                                                    id: Date.now().toString(),
                                                                    title: `Instagram Story ${count}`,
                                                                    description: '',
                                                                    taskType: 'story',
                                                                    platform: 'instagram',
                                                                    priority: 'required',
                                                                    googleFormLink: '',
                                                                    googleFormLabel: '',
                                                                    ticketLink: '',
                                                                    ticketLabel: 'Add this ticket link (Story Sticker)',
                                                                    creativeLink: '',
                                                                    creativeLabel: '',
                                                                    referencePostUrl: '',
                                                                    referencePostLabel: 'Repost this poster',
                                                                    taskLinks: [],
                                                                    creativeAssets: [],
                                                                    creativeLinks: [],
                                                                    submissions: {}
                                                                }]
                                                            }));
                                                        }}
                                                        className="h-9 rounded-xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 hover:border-neon-green/50 hover:bg-neon-green/5 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                    >
                                                        <Eye size={12} /> + Story
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const count = formData.tasks.filter(t => t.taskType === 'reel' || (t.title || '').toLowerCase().includes('reel')).length + 1;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                tasks: [...prev.tasks, {
                                                                    id: Date.now().toString(),
                                                                    title: `Instagram Reel ${count}`,
                                                                    description: '',
                                                                    taskType: 'reel',
                                                                    platform: 'instagram',
                                                                    priority: 'required',
                                                                    googleFormLink: '',
                                                                    googleFormLabel: '',
                                                                    ticketLink: '',
                                                                    ticketLabel: '',
                                                                    creativeLink: '',
                                                                    creativeLabel: '',
                                                                    referencePostUrl: '',
                                                                    referencePostLabel: 'Audio Track / Reel to Remix',
                                                                    taskLinks: [],
                                                                    creativeAssets: [],
                                                                    creativeLinks: [],
                                                                    submissions: {}
                                                                }]
                                                            }));
                                                        }}
                                                        className="h-9 rounded-xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 hover:border-neon-green/50 hover:bg-neon-green/5 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                    >
                                                        <Video size={12} /> + Reel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const count = formData.tasks.filter(t => t.taskType === 'content_post' || (t.title || '').toLowerCase().includes('post')).length + 1;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                tasks: [...prev.tasks, {
                                                                    id: Date.now().toString(),
                                                                    title: `Instagram Feed Post ${count}`,
                                                                    description: '',
                                                                    taskType: 'content_post',
                                                                    platform: 'instagram',
                                                                    priority: 'required',
                                                                    googleFormLink: '',
                                                                    googleFormLabel: '',
                                                                    ticketLink: '',
                                                                    ticketLabel: '',
                                                                    creativeLink: '',
                                                                    creativeLabel: '',
                                                                    referencePostUrl: '',
                                                                    referencePostLabel: 'Reference Post',
                                                                    taskLinks: [],
                                                                    creativeAssets: [],
                                                                    creativeLinks: [],
                                                                    submissions: {}
                                                                }]
                                                            }));
                                                        }}
                                                        className="h-9 rounded-xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 hover:border-neon-green/50 hover:bg-neon-green/5 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                    >
                                                        <Camera size={12} /> + Post
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="p-5 md:p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                                                {formData.tasks.map((task, index) => (
                                                    <TaskEditorCard 
                                                        key={task.id}
                                                        task={task}
                                                        index={index}
                                                        totalTasks={formData.tasks.length}
                                                        campaignId={editingId || expandedCampaignId}
                                                        onCopyTaskLink={(editingId || expandedCampaignId) ? (tId) => handleCopyTaskLink(editingId || expandedCampaignId, tId) : null}
                                                        onUpdate={handleUpdateTask}
                                                        onRemove={handleRemoveTask}
                                                        onMoveUp={handleMoveTaskUp}
                                                        onMoveDown={handleMoveTaskDown}
                                                        onUploadCreative={handleUploadTaskCreative}
                                                        isUploading={isUploadingTaskAsset}
                                                    />
                                                ))}
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            </motion.div>
                        ) : expandedCampaignId ? (
                            <motion.div
                                key="detail-view"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                className="max-w-7xl mx-auto"
                            >
                                <CampaignDetailView 
                                    campaignId={expandedCampaignId}
                                    onClose={() => navigate('/admin/campaigns')}
                                    onEdit={(c) => handleEdit(c)}
                                    onToggleShortlist={handleToggleShortlist}
                                    onAutoShortlist={handleAutoShortlist}
                                    onToggleAutoShortlist={handleToggleAutoShortlistCampaign}
                                    onReviewSubmission={handleReviewSubmission}
                                    onDelete={handleDeleteCampaign}
                                    updateCampaign={handleUpdateCampaignStatus}
                                    onCopyLink={() => handleCopyLink(expandedCampaignId)}
                                    onCopyTaskLink={(taskId) => handleCopyTaskLink(expandedCampaignId, taskId)}
                                />
                            </motion.div>
                        ) : (
                            <CampaignList
                                key="list"
                                campaigns={campaigns}
                                creators={creators}
                                loaded={campaignsLoaded}
                                onOpen={(c) => navigate(`/admin/campaigns/manage/${encodeURIComponent(c.id)}`)}
                                onEdit={(c) => handleEdit(c)}
                                onCreate={() => navigate('/admin/campaigns/create')}
                                onDelete={handleDeleteCampaign}
                                onUpdate={handleUpdateCampaignStatus}
                                onCopyLink={handleCopyLink}
                                isUpdating={isUpdating}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

    const content = renderContent();

    return (
        <>
            {content}
            
            {createPortal(
                <AnimatePresence>
                    {rejectionModal && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40" onClick={() => setRejectionModal(null)} />
                            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="relative z-10 w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 font-sans shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Reject submission</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">The creator sees this note and can resubmit.</p>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="What needs to change?"
                                    rows={5}
                                    className="mt-4 w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                />
                                <div className="mt-4 flex justify-end gap-2">
                                    <button type="button" onClick={() => setRejectionModal(null)} className="inline-flex h-9 items-center rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">Cancel</button>
                                    <button
                                        type="button"
                                        onClick={confirmRejection}
                                        disabled={isReviewing}
                                        className="inline-flex h-9 min-w-[110px] items-center justify-center rounded-lg bg-red-600 px-3.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {isReviewing ? <LoadingSpinner size="xs" color="white" /> : 'Reject'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

/* --- Resilient Fixed-Size Creator Avatar --- */
const CreatorApplicantAvatar = ({ creator, onClick, size = "md" }) => {
    const [imgError, setImgError] = useState(false);
    
    // Check all potential avatar photo fields in creator profile
    const photoSrc = !imgError ? (
        creator?.profilePicture || 
        creator?.instagramProfilePic || 
        creator?.profilePic || 
        creator?.photoURL || 
        creator?.avatar || 
        creator?.profile_pic_url
    ) : null;

    const initial = (creator?.name || creator?.instagram || 'C').trim().charAt(0).toUpperCase() || 'C';

    // Deterministic palette based on creator name
    const colorOptions = [
        'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'bg-neon-pink/20 text-neon-pink border-neon-pink/30',
        'bg-neon-blue/20 text-neon-blue border-neon-blue/30',
        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ];
    const charCode = (creator?.name || creator?.id || 'A').charCodeAt(0);
    const colorClass = colorOptions[charCode % colorOptions.length] || colorOptions[0];

    const sizeClasses = size === 'sm' 
        ? "w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-xl text-sm"
        : "w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl text-base";

    return (
        <div 
            onClick={onClick}
            className={cn(
                sizeClasses,
                "overflow-hidden shrink-0 flex items-center justify-center font-heading font-black cursor-pointer hover:scale-105 transition-transform shadow-xs relative bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 select-none",
                !photoSrc ? colorClass : ""
            )}
        >
            {photoSrc ? (
                <img 
                    src={photoSrc} 
                    alt="" 
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                />
            ) : (
                <span className="font-black leading-none">{initial}</span>
            )}
        </div>
    );
};

/* --- Detailed Mission Modal --- */

const CampaignDetailView = ({ 
    campaignId, 
    onClose, 
    onEdit, 
    onToggleShortlist, 
    onAutoShortlist, 
    onToggleAutoShortlist, 
    onReviewSubmission, 
    onDelete, 
    updateCampaign, 
    onCopyLink, 
    onCopyTaskLink 
}) => {
    const { campaigns, creators } = useStore();
    const campaignsLoaded = useStore(state => Boolean(state.subscriptionsLoaded?.campaigns));
    const campaign = findCampaignById(campaigns, campaignId);
    const [activeTab, setActiveTab] = useState('applicants'); // applicants | tasks
    
    // Applications view controls
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all | eligible | shortlisted | pending | below
    const [sortBy, setSortBy] = useState('followers_desc'); // followers_desc | followers_asc | shortlisted_first | name_asc
    const [isAutoShortlisting, setIsAutoShortlisting] = useState(false);
    const [selectedCreatorForModal, setSelectedCreatorForModal] = useState(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    
    // Tasks view controls
    const [taskFilter, setTaskFilter] = useState('all'); // all | needs_review | approved | not_started

    const minFollowers = Number(campaign?.minInstagramFollowers || 0);

    const appliedCreators = useMemo(() => {
        if (!campaign) return [];
        return (creators || []).filter(c => (c.joinedCampaigns || []).includes(campaign.id));
    }, [campaign, creators]);

    const approvedCreators = useMemo(() => {
        if (!campaign) return [];
        return appliedCreators.filter(c => (c.shortlistedCampaigns || []).includes(campaign.id));
    }, [campaign, appliedCreators]);

    // Criteria classification (must meet both minimum follower count AND target city)
    const eligibleCreators = useMemo(() => {
        if (!campaign) return [];
        return appliedCreators.filter(c => {
            const meetsFollowers = Number(c.instagramFollowers || 0) >= minFollowers;
            const meetsCity = isCampaignCityMatch(campaign.targetCity, c.city);
            return meetsFollowers && meetsCity;
        });
    }, [appliedCreators, minFollowers, campaign]);

    const eligibleUnshortlisted = useMemo(() => {
        if (!campaign) return [];
        return eligibleCreators.filter(c => !(c.shortlistedCampaigns || []).includes(campaign.id));
    }, [eligibleCreators, campaign]);

    const belowCriteriaCreators = useMemo(() => {
        if (!campaign) return [];
        return appliedCreators.filter(c => {
            const meetsFollowers = Number(c.instagramFollowers || 0) >= minFollowers;
            const meetsCity = isCampaignCityMatch(campaign.targetCity, c.city);
            return !(meetsFollowers && meetsCity);
        });
    }, [appliedCreators, minFollowers, campaign]);

    // Filter & sort creators
    const filteredCreators = useMemo(() => {
        if (!campaign) return [];
        let list = [...appliedCreators];

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(c => 
                (c.name || '').toLowerCase().includes(q) ||
                (c.instagram || '').toLowerCase().includes(q) ||
                (c.city || '').toLowerCase().includes(q) ||
                (c.phone || '').includes(q)
            );
        }

        // Status filter
        if (filterStatus === 'eligible') {
            list = list.filter(c => 
                Number(c.instagramFollowers || 0) >= minFollowers && 
                isCampaignCityMatch(campaign.targetCity, c.city)
            );
        } else if (filterStatus === 'shortlisted') {
            list = list.filter(c => (c.shortlistedCampaigns || []).includes(campaign.id));
        } else if (filterStatus === 'pending') {
            list = list.filter(c => 
                Number(c.instagramFollowers || 0) >= minFollowers && 
                isCampaignCityMatch(campaign.targetCity, c.city) && 
                !(c.shortlistedCampaigns || []).includes(campaign.id)
            );
        } else if (filterStatus === 'below') {
            list = list.filter(c => 
                !(Number(c.instagramFollowers || 0) >= minFollowers && isCampaignCityMatch(campaign.targetCity, c.city))
            );
        }

        // Sorting
        list.sort((a, b) => {
            const fA = Number(a.instagramFollowers || 0);
            const fB = Number(b.instagramFollowers || 0);
            const isShortlistedA = (a.shortlistedCampaigns || []).includes(campaign.id);
            const isShortlistedB = (b.shortlistedCampaigns || []).includes(campaign.id);

            if (sortBy === 'followers_desc') return fB - fA;
            if (sortBy === 'followers_asc') return fA - fB;
            if (sortBy === 'shortlisted_first') {
                if (isShortlistedA !== isShortlistedB) return isShortlistedB ? 1 : -1;
                return fB - fA;
            }
            if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
            return 0;
        });

        return list;
    }, [appliedCreators, searchQuery, filterStatus, sortBy, minFollowers, campaign]);

    if (!campaign) return null;

    const spotsInfo = getCampaignSpotsInfo(campaign, creators);
    const tasks = campaign.tasks || [];
    
    const totalPendingReviews = tasks.reduce((sum, t) => {
        const subs = Object.values(t.submissions || {});
        return sum + subs.filter(s => s.status === 'submitted').length;
    }, 0);

    // Format helper for follower labels
    const fmtFollowers = (val) => {
        const n = Number(val || 0);
        if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
        return n.toLocaleString();
    };

    // Handle Auto-Shortlist All Qualifying Creators
    const handleTriggerAutoShortlist = async () => {
        if (isAutoShortlisting || eligibleUnshortlisted.length === 0) return;
        setIsAutoShortlisting(true);
        try {
            const uidsToShortlist = eligibleUnshortlisted.map(c => c.uid || c.id);
            if (onAutoShortlist) {
                await onAutoShortlist(campaign.id, uidsToShortlist);
            } else {
                await useStore.getState().bulkShortlistCreators(campaign.id, uidsToShortlist, true);
                useStore.getState().addToast(`Auto-shortlisted ${uidsToShortlist.length} creators!`, 'success');
            }
        } catch (err) {
            console.error("Auto-shortlist error:", err);
            useStore.getState().addToast("Failed to run auto-shortlist.", 'error');
        } finally {
            setIsAutoShortlisting(false);
        }
    };

    // Quick Clipboard Copy of Handles
    const handleCopyAllHandles = (targetList = approvedCreators) => {
        const handles = targetList
            .map(c => c.instagram ? `@${c.instagram.replace(/^@/, '')}` : null)
            .filter(Boolean)
            .join(', ');
        
        if (!handles) {
            useStore.getState().addToast("No Instagram handles found to copy.", 'error');
            return;
        }
        copyToClipboard(handles);
        useStore.getState().addToast(`Copied ${targetList.length} handles to clipboard!`, 'success');
    };

    // Quick Clipboard Copy of Phones
    const handleCopyAllPhones = (targetList = approvedCreators) => {
        const phones = targetList
            .map(c => c.phone ? normalizePhoneNumber(c.phone) : null)
            .filter(Boolean)
            .join(', ');
        
        if (!phones) {
            useStore.getState().addToast("No phone numbers found to copy.", 'error');
            return;
        }
        copyToClipboard(phones);
        useStore.getState().addToast(`Copied ${targetList.length} phone numbers!`, 'success');
    };

    // Direct links can arrive before the campaigns listener has data, or point at
    // a campaign that was deleted. Don't render the dashboard against nothing.
    if (!campaign) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center font-sans dark:border-zinc-800 dark:bg-zinc-900">
                {campaignsLoaded ? (
                    <>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Campaign not found</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">It may have been deleted, or the link is wrong.</p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-4 inline-flex h-9 items-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Back to campaigns
                        </button>
                    </>
                ) : (
                    <div className="flex justify-center"><LoadingSpinner size="md" color="#71717a" /></div>
                )}
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full space-y-6 pb-24 pt-0 relative"
        >
            {/* Header: breadcrumb + actions */}
            <div className="flex flex-col gap-4 font-sans lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400">
                        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 hover:text-gray-900 hover:underline dark:hover:text-white">
                            <ArrowLeft size={14} /> Campaigns
                        </button>
                    </nav>
                    <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{campaign.title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" title="Automatically shortlist new applicants who meet the follower and city criteria">
                        <input
                            type="checkbox"
                            checked={Boolean(campaign.autoShortlistEligible)}
                            onChange={async () => {
                                if (onToggleAutoShortlist) {
                                    await onToggleAutoShortlist(campaign.id);
                                } else {
                                    await updateCampaign(campaign.id, { autoShortlistEligible: !campaign.autoShortlistEligible });
                                }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                        />
                        Auto-shortlist
                    </label>
                    <button
                        type="button"
                        onClick={() => updateCampaign(campaign.id, { status: (!campaign.status || String(campaign.status).toLowerCase() === 'open') ? 'Closed' : 'Open' })}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                        {(!campaign.status || String(campaign.status).toLowerCase() === 'open') ? <><Lock size={14} /> Close applications</> : <><Unlock size={14} /> Reopen applications</>}
                    </button>
                    <a
                        href={`/campaign/${encodeURIComponent(campaign.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Eye size={14} /> Public page
                    </a>
                    <button
                        type="button"
                        onClick={onCopyLink}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Share2 size={14} /> Copy link
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(campaign)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                    >
                        <Edit size={14} /> Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm(`Delete “${campaign.title}”? Applicants and task submissions for this campaign will be lost. This cannot be undone.`)) {
                                onDelete(campaign.id);
                            }
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-500/10"
                        title="Delete campaign"
                        aria-label="Delete campaign"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Ultra-Aesthetic Campaign Showcase Hero Card */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start justify-between">
                    <div className="flex flex-col sm:flex-row items-start gap-6 w-full lg:w-auto flex-1">
                        {/* High-Impact Thumbnail - Uncropped Widescreen */}
                        <div className="w-full sm:w-60 md:w-72 aspect-video rounded-2xl sm:rounded-3xl bg-gray-100 dark:bg-black/60 border border-black/[0.08] dark:border-white/[0.1] overflow-hidden shrink-0 group relative flex items-center justify-center shadow-lg">
                            {campaign.thumbnail ? (
                                <>
                                    {/* Ambient blurred backdrop so any aspect ratio never crops */}
                                    <img 
                                        src={campaign.thumbnail} 
                                        alt="" 
                                        className="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110 opacity-40 pointer-events-none" 
                                    />
                                    <img 
                                        src={campaign.thumbnail} 
                                        alt={campaign.title} 
                                        className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" 
                                    />
                                </>
                            ) : (
                                <span className="font-heading font-black text-gray-400 text-xs tracking-widest uppercase">No Image</span>
                            )}
                            <div className="absolute top-2.5 right-2.5 z-20">
                                <StatusPill status={campaign.status} />
                            </div>
                        </div>

                        {/* Title, Brand & Metadata */}
                        <div className="space-y-4 flex-1 min-w-0">
                            <div>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 text-emerald-700 dark:text-neon-green font-black tracking-widest text-[9px] uppercase border border-neon-green/20">
                                        <Target size={11} /> CAMPAIGN BRIEF
                                    </span>

                                    {(campaign.brand || campaign.brandLogo) && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                                            {campaign.brandLogo && (
                                                <img src={campaign.brandLogo} alt="" className="w-3.5 h-3.5 rounded object-contain shrink-0" />
                                            )}
                                            {campaign.brand && (
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                                                    {campaign.brand}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {campaign.autoShortlistEligible && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 text-[9px] font-black uppercase tracking-wider font-mono">
                                            <Zap size={10} className="fill-current" /> Auto-Shortlist Enabled
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-2xl sm:text-4xl font-heading font-black text-gray-950 dark:text-white tracking-tight leading-tight">
                                    {campaign.title}
                                </h1>
                            </div>

                            {/* Metadata Pills */}
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                                <span className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.08] px-3.5 py-1.5 rounded-full text-gray-700 dark:text-zinc-300 shadow-xs">
                                    <MapPin size={12} className="text-neon-pink" /> {campaign.targetCity || 'PAN-INDIA / GLOBAL'}
                                </span>

                                {campaign.targetCollege && campaign.targetCollege !== 'Any' && (
                                    <span className="flex items-center gap-1.5 bg-neon-blue/10 border border-neon-blue/20 px-3.5 py-1.5 rounded-full text-neon-blue">
                                        <Layers size={12} /> {campaign.targetCollege}
                                    </span>
                                )}

                                <span className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 px-3.5 py-1.5 rounded-full text-emerald-700 dark:text-neon-green shadow-xs">
                                    <IndianRupee size={12} /> {campaign.reward || 'Perks & Collab'}
                                </span>

                                {/* Minimum Followers Requirement Pill */}
                                <span className={cn(
                                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-xs transition-colors",
                                    minFollowers > 0 
                                        ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 font-mono" 
                                        : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400"
                                )}>
                                    <Users size={12} className={minFollowers > 0 ? "text-purple-500" : ""} /> 
                                    {minFollowers > 0 ? `${minFollowers.toLocaleString()}+ FOLLOWERS REQUIRED` : 'ANY FOLLOWER COUNT'}
                                </span>

                                {/* Spots Info */}
                                {spotsInfo.hasSpots && (
                                    <span className={cn(
                                        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-xs",
                                        spotsInfo.isFull 
                                            ? "bg-red-500/10 border-red-500/25 text-red-500" 
                                            : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400"
                                    )}>
                                        <Users size={12} /> 
                                        {spotsInfo.isFull ? '0 SPOTS LEFT (FULL)' : `${spotsInfo.spotsLeft} SPOTS LEFT`} 
                                        <span className="opacity-70">({approvedCreators.length} SHORTLISTED{spotsInfo.totalSpots ? ` / ${spotsInfo.totalSpots}` : ''})</span>
                                    </span>
                                )}
                            </div>

                            {/* KPI Metrics Dashboard Bar */}
                            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                                <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">Total Applied</p>
                                    <p className="text-xl font-heading font-black text-gray-950 dark:text-white">{appliedCreators.length}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-purple-500/[0.05] border border-purple-500/15">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-0.5">Criteria Met</p>
                                    <p className="text-xl font-heading font-black text-purple-700 dark:text-purple-300">{eligibleCreators.length}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/15">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">Shortlisted</p>
                                    <p className="text-xl font-heading font-black text-emerald-700 dark:text-neon-green">{approvedCreators.length}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">Deliverables</p>
                                    <p className="text-xl font-heading font-black text-gray-950 dark:text-white">{tasks.length}</p>
                                </div>
                                <div className={cn("p-3 rounded-2xl border col-span-2 sm:col-span-1", totalPendingReviews > 0 ? "bg-amber-500/[0.08] border-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.06]")}>
                                    <p className="text-[9px] font-black uppercase tracking-widest mb-0.5">Reviews Due</p>
                                    <p className="text-xl font-heading font-black">{totalPendingReviews}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Community Action */}
                    {campaign.whatsappLink && (
                        <div className="shrink-0 w-full lg:w-auto flex flex-col items-stretch lg:items-end gap-2">
                            <a 
                                href={campaign.whatsappLink} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="group flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all shadow-lg active:scale-95"
                            >
                                <MessageCircle size={16} className="group-hover:rotate-12 transition-transform" />
                                <span>CAMPAIGN WHATSAPP</span>
                                <ExternalLink size={13} />
                            </a>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center lg:text-right">OFFICIAL CREATOR CHAT</span>
                        </div>
                    )}
                </div>

                {/* Campaign Description */}
                {campaign.description && (
                    <div className="mt-8 pt-6 border-t border-black/[0.08] dark:border-white/[0.08]">
                        <div className={cn(
                            "text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed prose prose-invert max-w-none transition-all duration-300",
                            !isDescriptionExpanded && "line-clamp-3"
                        )} dangerouslySetInnerHTML={{ __html: campaign.description }} />
                        <button 
                            type="button"
                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-neon-green hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            {isDescriptionExpanded ? 'SHOW LESS' : 'READ FULL BRIEF'}
                            <ChevronDown size={12} className={cn("transition-transform duration-200", isDescriptionExpanded && "rotate-180")} />
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs & Content Navigation */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-1">
                    <div className="flex gap-2">
                        {['applicants', 'tasks'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "relative px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2.5",
                                    activeTab === tab ? "text-gray-950 dark:text-white" : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                            >
                                <span>{tab === 'applicants' ? 'APPLICATIONS' : 'CAMPAIGN TASKS'}</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors",
                                    activeTab === tab 
                                        ? "bg-neon-green/20 text-emerald-800 dark:text-neon-green" 
                                        : "bg-black/5 dark:bg-white/5 text-gray-500"
                                )}>
                                    {tab === 'applicants' ? appliedCreators.length : tasks.length}
                                </span>
                                {tab === 'tasks' && totalPendingReviews > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title={`${totalPendingReviews} submissions pending review`} />
                                )}
                                {activeTab === tab && (
                                    <motion.div layoutId="tab-underline" className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-neon-green rounded-full shadow-[0_0_12px_rgba(46,255,142,0.8)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Quick export tools on the right of tabs */}
                    {activeTab === 'applicants' && appliedCreators.length > 0 && (
                        <div className="hidden sm:flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleCopyAllHandles(approvedCreators.length > 0 ? approvedCreators : eligibleCreators)}
                                className="h-8 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 transition-all active:scale-95"
                                title="Copy handles for Instagram tag / group"
                            >
                                <Copy size={11} /> Copy Handles
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCopyAllPhones(approvedCreators.length > 0 ? approvedCreators : eligibleCreators)}
                                className="h-8 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 transition-all active:scale-95"
                                title="Copy phones for WhatsApp broadcast"
                            >
                                <Phone size={11} /> Copy Phones
                            </button>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'applicants' ? (
                            <div className="space-y-6">
                                {/* Auto-Shortlist Automation Command Banner */}
                                <div className="relative overflow-hidden rounded-3xl border border-neon-green/30 bg-gradient-to-r from-emerald-500/[0.08] via-neon-green/[0.05] to-purple-500/[0.05] p-5 sm:p-7 shadow-[0_10px_35px_rgba(46,255,142,0.06)]">
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="w-8 h-8 rounded-xl bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-emerald-800 dark:text-neon-green shadow-xs">
                                                    <Zap size={16} className="fill-current text-neon-green" />
                                                </div>
                                                <h3 className="text-base sm:text-lg font-heading font-black text-gray-950 dark:text-white uppercase tracking-tight">
                                                    AUTO-SHORTLIST ENGINE
                                                </h3>
                                                <span className="px-2.5 py-0.5 rounded-full bg-neon-green/20 text-emerald-800 dark:text-neon-green font-mono text-[10px] font-black uppercase">
                                                    CRITERIA: ≥ {minFollowers.toLocaleString()} FOLLOWERS
                                                </span>
                                                {campaign.targetCity && !['any', 'all', 'universal', 'pan-india', 'global', 'remote', '', 'national', 'any hub', 'others', 'pan-india / remote'].includes(campaign.targetCity.toLowerCase()) && (
                                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-black uppercase flex items-center gap-1">
                                                        <MapPin size={10} /> TARGET: {campaign.targetCity.toUpperCase()} ONLY
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-300 font-medium">
                                                {eligibleUnshortlisted.length > 0 ? (
                                                    <span>
                                                        <strong className="text-emerald-700 dark:text-neon-green font-black">{eligibleUnshortlisted.length} eligible creator{eligibleUnshortlisted.length === 1 ? '' : 's'}</strong> meet both the {minFollowers.toLocaleString()} follower criteria and target city requirement ({campaign.targetCity || 'Universal'}) and {eligibleUnshortlisted.length === 1 ? 'is' : 'are'} awaiting shortlist approval.
                                                    </span>
                                                ) : eligibleCreators.length > 0 ? (
                                                    <span className="text-emerald-700 dark:text-neon-green font-bold flex items-center gap-1.5">
                                                        <CheckCircle2 size={15} /> All {eligibleCreators.length} qualifying creator{eligibleCreators.length === 1 ? '' : 's'} meeting the {minFollowers.toLocaleString()}+ follower and target city requirements are shortlisted!
                                                    </span>
                                                ) : (
                                                    <span>No applicants currently meet both the {minFollowers.toLocaleString()}+ follower criteria and target city requirement ({campaign.targetCity || 'Universal'}).</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Action Button */}
                                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                                            <button 
                                                onClick={handleTriggerAutoShortlist}
                                                disabled={isAutoShortlisting || eligibleUnshortlisted.length === 0}
                                                className={cn(
                                                    "h-12 px-6 rounded-2xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2.5 shadow-lg active:scale-95 cursor-pointer font-mono",
                                                    eligibleUnshortlisted.length > 0
                                                        ? "bg-gradient-to-r from-emerald-500 to-neon-green text-black hover:opacity-90 shadow-neon-green/20"
                                                        : "bg-black/10 dark:bg-white/10 text-gray-400 dark:text-zinc-500 cursor-not-allowed border border-black/10 dark:border-white/10"
                                                )}
                                            >
                                                {isAutoShortlisting ? (
                                                    <>
                                                        <LoadingSpinner size="xs" color="black" />
                                                        <span>SHORTLISTING CREATORS...</span>
                                                    </>
                                                ) : eligibleUnshortlisted.length > 0 ? (
                                                    <>
                                                        <Zap size={15} className="fill-current" />
                                                        <span>AUTO-SHORTLIST ({eligibleUnshortlisted.length} ELIGIBLE)</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check size={15} />
                                                        <span>ALL ELIGIBLE SHORTLISTED</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Search & Filtering Tool Bar */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
                                    {/* Search Input */}
                                    <div className="relative flex-1 min-w-[240px]">
                                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            type="text" 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by creator name, @instagram, phone, city..." 
                                            className="w-full h-10 pl-10 pr-10 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-neon-green/50 transition-colors"
                                        />
                                        {searchQuery && (
                                            <button 
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Filter Status Pills */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
                                        {[
                                            { id: 'all', label: `All (${appliedCreators.length})` },
                                            { id: 'eligible', label: `Eligible (≥${fmtFollowers(minFollowers)}) (${eligibleCreators.length})` },
                                            { id: 'shortlisted', label: `Shortlisted (${approvedCreators.length})` },
                                            { id: 'pending', label: `Awaiting (${eligibleUnshortlisted.length})` },
                                            { id: 'below', label: `Below Criteria (${belowCriteriaCreators.length})` },
                                        ].map(f => (
                                            <button 
                                                key={f.id}
                                                onClick={() => setFilterStatus(f.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 shrink-0 border",
                                                    filterStatus === f.id 
                                                        ? "bg-gray-950 text-white dark:bg-white dark:text-black border-transparent shadow-xs" 
                                                        : "bg-black/[0.02] dark:bg-white/[0.02] text-gray-600 dark:text-zinc-400 border-black/[0.06] dark:border-white/[0.06] hover:bg-black/5 dark:hover:bg-white/5"
                                                )}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Sort Dropdown */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <ArrowUpDown size={14} className="text-gray-400" />
                                        <select 
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="h-10 px-3 pr-8 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs font-black uppercase tracking-wider text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-neon-green/50 cursor-pointer"
                                        >
                                            <option value="followers_desc">Most Followers</option>
                                            <option value="followers_asc">Least Followers</option>
                                            <option value="shortlisted_first">Shortlisted First</option>
                                            <option value="name_asc">Name (A - Z)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Applications Grid */}
                                {filteredCreators.length === 0 ? (
                                    <div className="py-20 text-center bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center text-gray-400">
                                            <Users size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-base font-heading font-black text-gray-950 dark:text-white">
                                                {appliedCreators.length === 0 ? 'No Applications Yet' : 'No Matching Creators'}
                                            </p>
                                            <p className="text-xs font-medium text-gray-500">
                                                {appliedCreators.length === 0 
                                                    ? 'Creators who apply to this campaign will appear here' 
                                                    : 'Try clearing your search query or switching filters above'}
                                            </p>
                                        </div>
                                        {appliedCreators.length > 0 && (
                                            <button 
                                                onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                                                className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300 hover:bg-black/10 transition-colors"
                                            >
                                                Reset Filters
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                                        {filteredCreators.map(creator => {
                                            const isShortlisted = (creator.shortlistedCampaigns || []).includes(campaign.id);
                                            const followersCount = Number(creator.instagramFollowers || 0);
                                            const meetsFollowers = minFollowers <= 0 || followersCount >= minFollowers;
                                            const meetsCity = isCampaignCityMatch(campaign.targetCity, creator.city);
                                            const meetsCriteria = meetsFollowers && meetsCity;
                                            const cleanInstagram = (creator.instagram || '').replace(/^@/, '');
                                            const waNumber = creator.phone ? normalizePhoneNumber(creator.phone) : null;
                                            const hasSpecificCity = campaign.targetCity && !['any', 'all', 'universal', 'pan-india', 'global', 'remote', '', 'national', 'any hub', 'others', 'pan-india / remote'].includes(campaign.targetCity.trim().toLowerCase());

                                            return (
                                                <div 
                                                    key={creator.uid || creator.id} 
                                                    className={cn(
                                                        "p-5 rounded-3xl border transition-all duration-300 group relative flex flex-col justify-between overflow-hidden bg-white dark:bg-[#0c0e14] h-full min-h-[174px]",
                                                        isShortlisted 
                                                            ? "border-neon-green/50 shadow-[0_4px_25px_rgba(46,255,142,0.12)] ring-1 ring-neon-green/30" 
                                                            : meetsCriteria
                                                                ? "border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 shadow-xs"
                                                                : "border-black/[0.05] dark:border-white/[0.05] bg-gray-50/50 dark:bg-[#08090d]/50 opacity-90"
                                                    )}
                                                >
                                                    {/* Ambient top border gradient indicator */}
                                                    <div className={cn(
                                                        "absolute top-0 left-0 right-0 h-1 transition-colors",
                                                        isShortlisted 
                                                            ? "bg-neon-green" 
                                                            : meetsCriteria 
                                                                ? "bg-purple-500/30 group-hover:bg-purple-500" 
                                                                : "bg-gray-300 dark:bg-zinc-800"
                                                    )} />

                                                    {/* Card Top: Avatar, Name, Shortlist Toggle */}
                                                    <div>
                                                        <div className="flex items-start justify-between gap-3 mb-3.5">
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <CreatorApplicantAvatar 
                                                                    creator={creator} 
                                                                    onClick={() => setSelectedCreatorForModal(creator)} 
                                                                />

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <h4 
                                                                            onClick={() => setSelectedCreatorForModal(creator)}
                                                                            className="text-sm sm:text-base font-heading font-black text-gray-950 dark:text-white tracking-tight truncate hover:text-neon-green transition-colors cursor-pointer"
                                                                        >
                                                                            {creator.name}
                                                                        </h4>
                                                                        {creator.instagramVerified && (
                                                                            <ShieldCheck size={14} className="text-neon-blue shrink-0" title="Verified Instagram" />
                                                                        )}
                                                                    </div>

                                                                    {cleanInstagram && (
                                                                        <a 
                                                                            href={`https://instagram.com/${cleanInstagram}`} 
                                                                            target="_blank" 
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-neon-pink transition-colors mt-0.5 group/insta max-w-full truncate"
                                                                        >
                                                                            <span className="truncate">@{cleanInstagram}</span>
                                                                            <ExternalLink size={10} className="opacity-0 group-hover/insta:opacity-100 transition-opacity shrink-0" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Shortlist Toggle Button */}
                                                            <button 
                                                                onClick={() => onToggleShortlist(creator.uid || creator.id, campaign.id)}
                                                                className={cn(
                                                                    "h-9 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shrink-0",
                                                                    isShortlisted 
                                                                        ? "bg-neon-green text-black border-transparent shadow-sm hover:bg-red-500 hover:text-white group/btn" 
                                                                        : meetsCriteria
                                                                            ? "bg-black/5 dark:bg-white/5 text-gray-800 dark:text-zinc-200 border-black/10 dark:border-white/10 hover:bg-neon-green hover:text-black hover:border-transparent"
                                                                            : "bg-black/[0.02] dark:bg-white/[0.02] text-gray-400 dark:text-zinc-500 border-black/[0.06] dark:border-white/[0.06] hover:bg-black/5"
                                                                )}
                                                            >
                                                                {isShortlisted ? (
                                                                    <>
                                                                        <Check size={12} strokeWidth={3} className="group-hover/btn:hidden" />
                                                                        <span className="group-hover/btn:hidden">SHORTLISTED</span>
                                                                        <span className="hidden group-hover/btn:inline">REMOVE</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Plus size={12} strokeWidth={3} />
                                                                        <span>SHORTLIST</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* Follower Criteria & City Match Evaluation Badges */}
                                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                                            <div className={cn(
                                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs font-mono",
                                                                meetsFollowers
                                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-neon-green"
                                                                    : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400"
                                                            )}>
                                                                <Instagram size={12} className="text-neon-pink shrink-0" />
                                                                <span>{followersCount.toLocaleString()} FOLLOWERS</span>
                                                                {minFollowers > 0 && (
                                                                    <span className={cn(
                                                                        "px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-widest",
                                                                        meetsFollowers ? "bg-emerald-500/20 text-emerald-800 dark:text-neon-green" : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                                                    )}>
                                                                        {meetsFollowers ? '✓ FOLLOWERS OK' : `BELOW ${minFollowers.toLocaleString()} REQ`}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {creator.city ? (
                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-bold font-mono",
                                                                    hasSpecificCity 
                                                                        ? (meetsCity 
                                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-neon-green"
                                                                            : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400")
                                                                        : "bg-black/5 dark:bg-white/5 border-black/[0.06] dark:border-white/[0.06] text-gray-600 dark:text-zinc-400"
                                                                )}>
                                                                    <MapPin size={10} className={hasSpecificCity ? (meetsCity ? "text-emerald-500 dark:text-neon-green" : "text-red-500") : "text-gray-400"} />
                                                                    <span>{creator.city}</span>
                                                                    {hasSpecificCity && (
                                                                        <span className={cn(
                                                                            "px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider",
                                                                            meetsCity ? "bg-emerald-500/20 text-emerald-800 dark:text-neon-green" : "bg-red-500/20 text-red-600 dark:text-red-400"
                                                                        )}>
                                                                            {meetsCity ? '✓ TARGET CITY' : 'MISMATCH'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : hasSpecificCity ? (
                                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] font-bold font-mono text-red-600 dark:text-red-400">
                                                                    <MapPin size={10} className="text-red-500" />
                                                                    <span>NO CITY SET</span>
                                                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-red-500/20 text-red-600 dark:text-red-400">
                                                                        MISMATCH
                                                                    </span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {/* Card Bottom: Quick Actions */}
                                                    <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            {waNumber && (
                                                                <a 
                                                                    href={`https://wa.me/${waNumber}`} 
                                                                    target="_blank" 
                                                                    rel="noreferrer"
                                                                    className="h-8 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                                                    title="Open WhatsApp Chat"
                                                                >
                                                                    <MessageCircle size={11} />
                                                                    <span>CHAT</span>
                                                                </a>
                                                            )}
                                                            <button 
                                                                type="button"
                                                                onClick={() => setSelectedCreatorForModal(creator)}
                                                                className="h-8 px-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                                            >
                                                                <Eye size={11} />
                                                                <span>VIEW PROFILE</span>
                                                            </button>
                                                        </div>

                                                        {isShortlisted && (
                                                            <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-neon-green uppercase tracking-widest flex items-center gap-1">
                                                                <CheckCheck size={12} /> CONFIRMED
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* --- CAMPAIGN TASKS TAB --- */
                            <div className="space-y-6">
                                {tasks.length === 0 ? (
                                    <div className="py-20 text-center bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center text-gray-400">
                                            <Target size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-base font-heading font-black text-gray-950 dark:text-white">No Tasks Configured</p>
                                            <p className="text-xs font-medium text-gray-500">Edit this campaign to add deliverables for your shortlisted creators</p>
                                        </div>
                                        <button 
                                            onClick={() => onEdit(campaign)} 
                                            className="px-5 py-2.5 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:opacity-90 transition-opacity"
                                        >
                                            Add Deliverables
                                        </button>
                                    </div>
                                ) : tasks.map((task, idx) => {
                                    const taskSubmissions = task.submissions || {};
                                    const pendingForTask = Object.values(taskSubmissions).filter(s => s.status === 'submitted').length;
                                    const approvedForTask = Object.values(taskSubmissions).filter(s => s.status === 'approved').length;

                                    return (
                                        <div key={task.id || idx} className="space-y-6 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm">
                                            {/* Task Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] dark:border-white/[0.08] pb-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center font-black text-emerald-800 dark:text-neon-green text-lg font-heading shadow-xs">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-heading font-black text-gray-950 dark:text-white tracking-tight mb-1">
                                                            {task.title}
                                                        </h4>
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full border border-black/[0.06] dark:border-white/[0.06]">
                                                                {task.platform || 'INSTAGRAM'} TASK
                                                            </span>
                                                            {task.deadline && (
                                                                <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                                                                    <Calendar size={11} /> DEADLINE: {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] font-mono font-bold text-gray-400">
                                                                {approvedForTask} Approved · {pendingForTask} Pending Review
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => onCopyTaskLink(task.id)}
                                                    className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 text-gray-800 dark:text-zinc-200 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 w-fit active:scale-95"
                                                    title="Share Direct Task Link"
                                                >
                                                    <Share2 size={13} /> SHARE TASK
                                                </button>
                                            </div>

                                            {/* Google Form Submission Callout */}
                                            {task.googleFormLink && (
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-purple-500/[0.06] dark:bg-purple-500/[0.12] border border-purple-500/20 text-xs">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <FileText size={18} className="text-purple-500 shrink-0" />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black uppercase tracking-wider text-[10px] font-mono text-purple-700 dark:text-purple-300">
                                                                    Google Form Submission:
                                                                </span>
                                                                <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-200 font-mono">
                                                                    File Upload Link
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-[11px] text-gray-600 dark:text-zinc-300 truncate block mt-0.5">
                                                                {task.googleFormLink}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <a 
                                                        href={task.googleFormLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="shrink-0 h-9 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase font-mono flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                                                    >
                                                        <span>OPEN FORM</span>
                                                        <ExternalLink size={11} />
                                                    </a>
                                                </div>
                                            )}

                                            {/* Task Guidelines / Description */}
                                            {task.description && (
                                                <div 
                                                    className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed prose prose-invert max-w-none bg-black/[0.02] dark:bg-black/30 p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06]" 
                                                    dangerouslySetInnerHTML={{ __html: task.description }} 
                                                />
                                            )}

                                            {/* Task Verification Submissions Dashboard */}
                                            <div className="space-y-4 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                                        <CheckCircle2 size={14} className="text-neon-green" /> TASK VERIFICATION & SUBMISSIONS
                                                    </h5>
                                                    <div className={cn(
                                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        pendingForTask > 0 
                                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 animate-pulse" 
                                                            : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-500"
                                                    )}>
                                                        {pendingForTask} Awaiting Review
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {approvedCreators.length === 0 ? (
                                                        <div className="p-8 text-center bg-black/[0.02] dark:bg-black/20 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] text-gray-500 text-xs font-black uppercase tracking-widest space-y-2">
                                                            <p>No shortlisted creators assigned to this campaign yet.</p>
                                                            <button 
                                                                onClick={() => setActiveTab('applicants')} 
                                                                className="text-neon-green hover:underline text-[10px]"
                                                            >
                                                                Go to Applications to shortlist creators →
                                                            </button>
                                                        </div>
                                                    ) : approvedCreators.map(creator => {
                                                        const sub = task.submissions?.[creator.uid || creator.id];
                                                        const status = sub?.status || 'not_started';
                                                        const waNumber = creator.phone ? normalizePhoneNumber(creator.phone) : null;
                                                        
                                                        return (
                                                            <div 
                                                                key={creator.uid || creator.id} 
                                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#0c0e14] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] group hover:border-black/20 dark:hover:border-white/20 transition-all gap-4"
                                                            >
                                                                <div className="flex items-center gap-3.5">
                                                                    <CreatorApplicantAvatar 
                                                                        creator={creator} 
                                                                        size="sm"
                                                                        onClick={() => setSelectedCreatorForModal(creator)} 
                                                                    />
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p 
                                                                                onClick={() => setSelectedCreatorForModal(creator)}
                                                                                className="text-sm font-heading font-black text-gray-950 dark:text-white tracking-tight hover:text-neon-green transition-colors cursor-pointer"
                                                                            >
                                                                                {creator.name}
                                                                            </p>
                                                                            {creator.instagram && (
                                                                                <span className="text-[10px] font-bold text-gray-400">
                                                                                    @{creator.instagram.replace(/^@/, '')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className={cn(
                                                                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono", 
                                                                                status === 'approved' ? "bg-emerald-500/15 text-emerald-700 dark:text-neon-green" : 
                                                                                status === 'submitted' ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 animate-pulse" : 
                                                                                status === 'rejected' ? "bg-red-500/15 text-red-600 dark:text-red-400" : 
                                                                                "bg-black/5 dark:bg-white/5 text-gray-500"
                                                                            )}>
                                                                                {status === 'submitted' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                                                                {status.replace('_', ' ')}
                                                                            </span>
                                                                            {sub?.submittedAt && (
                                                                                <span className="text-[9px] font-mono text-gray-400">
                                                                                    {new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2.5">
                                                                    {sub?.submissionUrl && (
                                                                        <a 
                                                                            href={sub.submissionUrl} 
                                                                            target="_blank" 
                                                                            rel="noreferrer" 
                                                                            className="h-9 px-3.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-black/10 text-gray-800 dark:text-zinc-200 transition-all"
                                                                        >
                                                                            <ExternalLink size={12} /> VIEW PROOF
                                                                        </a>
                                                                    )}

                                                                    {status === 'submitted' && (
                                                                        <div className="flex gap-2">
                                                                            <button 
                                                                                onClick={() => onReviewSubmission(campaign.id, task.id, creator.uid || creator.id, 'approved')} 
                                                                                className="h-9 px-4 rounded-xl bg-emerald-500 text-black border border-transparent flex items-center gap-1.5 hover:bg-emerald-400 transition-all text-[10px] font-black uppercase tracking-wider active:scale-95"
                                                                                title="Approve Submission"
                                                                            >
                                                                                <Check size={13} strokeWidth={3} /> APPROVE
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => onReviewSubmission(campaign.id, task.id, creator.uid || creator.id, 'rejected')} 
                                                                                className="h-9 px-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider active:scale-95"
                                                                                title="Reject Submission"
                                                                            >
                                                                                <X size={13} strokeWidth={3} /> REJECT
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {status === 'not_started' && waNumber && (
                                                                        <a 
                                                                            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi ${creator.name}! Gentle reminder from Newbi Entertainment regarding your deliverable "${task.title}" for ${campaign.title}. Please submit your update soon!`)}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="h-9 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                                                            title="Send WhatsApp Nudge"
                                                                        >
                                                                            <MessageCircle size={11} /> NUDGE
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Creator Detail Modal Viewer */}
            {selectedCreatorForModal && (
                <CreatorDetailModal 
                    creator={selectedCreatorForModal} 
                    onClose={() => setSelectedCreatorForModal(null)} 
                />
            )}
        </motion.div>
    );
};

/* --- Task Editor Sub-component --- */

const TaskEditorCard = React.memo(({ task, index, totalTasks, campaignId, onCopyTaskLink, onUpdate, onRemove, onMoveUp, onMoveDown, onUploadCreative, isUploading }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const TaskTypeIcon = getTaskTypeIcon(task.taskType);
    const PlatformIcon = getPlatformIcon(task.platform);

    const taskLinks = task.taskLinks || [];

    const handleAddCustomLink = () => {
        const next = [...taskLinks, { id: Date.now().toString(), label: '', url: '' }];
        onUpdate(index, 'taskLinks', next);
    };

    const handleUpdateCustomLink = (linkIdx, field, val) => {
        const next = [...taskLinks];
        next[linkIdx] = { ...next[linkIdx], [field]: val };
        onUpdate(index, 'taskLinks', next);
    };

    const handleRemoveCustomLink = (linkIdx) => {
        const next = [...taskLinks];
        next.splice(linkIdx, 1);
        onUpdate(index, 'taskLinks', next);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            layout
            className="bg-white dark:bg-[#0c0e14] border border-black/10 dark:border-white/10 rounded-2xl relative group overflow-hidden shadow-sm hover:shadow-md transition-all"
        >
            <div className={cn("absolute top-0 left-0 w-full h-1", task.priority === 'required' ? 'bg-neon-green' : 'bg-black/10 dark:border-white/10')} />

            {/* Task Card Summary Bar (Mobile Friendly) */}
            <div className="flex items-center gap-2.5 p-3 sm:p-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 text-gray-400 hover:text-gray-600 transition-colors" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => onMoveUp(index)} disabled={index === 0} className="disabled:opacity-20 hover:text-neon-green p-0.5"><ChevronUp size={13} strokeWidth={2.5} /></button>
                    <button type="button" onClick={() => onMoveDown(index)} disabled={index === totalTasks - 1} className="disabled:opacity-20 hover:text-neon-green p-0.5"><ChevronDown size={13} strokeWidth={2.5} /></button>
                </div>
                
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs", task.priority === 'required' ? "bg-neon-green/10 border-neon-green/30 text-emerald-600 dark:text-neon-green" : "bg-white dark:bg-[#1a1d24] border-black/10 dark:border-white/10 text-gray-500")}>
                    <TaskTypeIcon size={18} strokeWidth={2.5} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <h4 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                            {task.title || `Task ${index + 1}`}
                        </h4>
                        {task.priority === 'required' && (
                            <span className="px-1.5 py-0.2 bg-neon-green/20 text-emerald-700 dark:text-neon-green rounded text-[8px] font-black uppercase tracking-widest shrink-0 font-mono">
                                REQ
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1 uppercase"><PlatformIcon size={11} /> {task.platform || 'Instagram'}</span>
                        {task.deadline && (
                            <span className="flex items-center gap-1">
                                <Clock size={10} /> {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                        {(task.googleFormLink || task.ticketLink || task.referencePostUrl || (task.taskLinks && task.taskLinks.length > 0)) && (
                            <span className="text-emerald-600 dark:text-neon-green font-bold flex items-center gap-0.5">
                                · Links Configured
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {campaignId && task.id && (
                        <button
                            type="button"
                            onClick={() => onCopyTaskLink?.(task.id)}
                            className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-neon-green hover:text-black text-gray-500 transition-all flex items-center justify-center"
                            title="Share direct task link"
                        >
                            <Share2 size={13} />
                        </button>
                    )}
                    <button type="button" onClick={() => onRemove(index)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center" title="Delete Task">
                        <Trash2 size={14} />
                    </button>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-black/5 dark:bg-white/5 text-gray-500", isExpanded && "bg-black/10 dark:bg-white/10")}>
                        <ChevronDown size={16} className={cn("transition-transform duration-300", isExpanded && "rotate-180")} />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-5 md:p-6 space-y-8 border-t border-black/[0.08] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.015]">
                            
                            {/* ① Basic Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-neon-green font-black font-mono">①</span>
                                    <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">Basic Info</h5>
                                    <div className="flex-1 h-px bg-black/5 dark:bg-white/5 ml-2"></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest block">Task Title</label>
                                    <Input required value={task.title} onChange={e => onUpdate(index, 'title', e.target.value)} placeholder="e.g. Instagram Story 1" className="w-full h-12 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest block">Platform</label>
                                        <StudioSelect value={task.platform || 'instagram'} options={PLATFORMS.map(p => ({ value: p.value, label: p.label.toUpperCase() }))} onChange={val => onUpdate(index, 'platform', val)} className="h-12 border-black/[0.1] dark:border-white/[0.08] rounded-xl text-sm bg-white dark:bg-black/40" accentColor="neon-green" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest block">Task Format</label>
                                        <StudioSelect value={task.taskType || 'custom'} options={TASK_TYPES.map(t => ({ value: t.value, label: t.label.toUpperCase() }))} onChange={val => onUpdate(index, 'taskType', val)} className="h-12 border-black/[0.1] dark:border-white/[0.08] rounded-xl text-sm bg-white dark:bg-black/40" accentColor="neon-green" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest block">Deadline</label>
                                        <StudioDatePicker value={task.deadline} onChange={val => onUpdate(index, 'deadline', val)} className="w-full h-12 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green/80 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20" placeholder="Set deadline" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest block">Requirement</label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => onUpdate(index, 'priority', 'required')} className={cn("flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", task.priority === 'required' ? "bg-neon-green text-black" : "bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 text-gray-500")}>Mandatory</button>
                                            <button type="button" onClick={() => onUpdate(index, 'priority', 'optional')} className={cn("flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", task.priority === 'optional' ? "bg-black text-white dark:bg-white dark:text-black" : "bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 text-gray-500")}>Optional</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ② Action Links & Buttons */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-neon-green font-black font-mono">②</span>
                                        <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                            Action Links & Buttons
                                        </h5>
                                    </div>
                                    <span className="text-[9px] text-gray-500 font-mono hidden sm:inline">
                                        1-tap Copy & Open buttons on mobile
                                    </span>
                                </div>

                                <div className="space-y-3 bg-black/[0.02] dark:bg-white/[0.02] p-3.5 sm:p-4 rounded-2xl border border-black/5 dark:border-white/5">
                                    {/* Google Form Link (Deliverable Submission & File Upload) */}
                                    <div className="p-3 rounded-xl bg-purple-500/[0.04] dark:bg-purple-500/[0.08] border border-purple-500/30 dark:border-purple-400/40 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5 font-mono">
                                                <FileText size={13} className="text-purple-500" />
                                                Google Form Link (Deliverable Submission & File Upload)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                                                    Opens in New Tab
                                                </span>
                                                {task.googleFormLink && (
                                                    <a href={task.googleFormLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 dark:text-purple-300 hover:underline flex items-center gap-1 font-mono">
                                                        <span>Test Form</span> <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-[9px] text-gray-400 font-mono uppercase block mb-1">Button Label (Optional)</span>
                                                <Input 
                                                    value={task.googleFormLabel || ''} 
                                                    onChange={e => onUpdate(index, 'googleFormLabel', e.target.value)} 
                                                    placeholder="e.g. Submit via Google Form" 
                                                    className="w-full h-10 bg-white dark:bg-[#0c0e14] border border-black/10 dark:border-white/10 rounded-lg px-3 text-xs text-gray-900 dark:text-white" 
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-gray-400 font-mono uppercase block mb-1">Google Form URL</span>
                                                <Input 
                                                    value={task.googleFormLink || ''} 
                                                    onChange={e => onUpdate(index, 'googleFormLink', e.target.value)} 
                                                    placeholder="https://forms.gle/... or docs.google.com/forms/..." 
                                                    className="w-full h-10 bg-white dark:bg-[#0c0e14] border border-black/10 dark:border-white/10 rounded-lg px-3 text-xs text-gray-900 dark:text-white font-mono" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 1. Ticket Link Sticker (e.g. BookMyShow / Event link) */}
                                    <div className="p-3 rounded-xl bg-white dark:bg-[#0c0e14] border border-black/10 dark:border-white/10 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-neon-green flex items-center gap-1.5 font-mono">
                                                <Ticket size={13} className="text-emerald-500" />
                                                1. Ticket Link (Story Sticker)
                                            </label>
                                            {task.ticketLink && (
                                                <a href={task.ticketLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 dark:text-neon-green hover:underline flex items-center gap-1 font-mono">
                                                    <span>Test Link</span> <ExternalLink size={10} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-[9px] text-gray-400 font-mono uppercase block mb-1">Button / Sticker Text</span>
                                                <Input 
                                                    value={task.ticketLabel || ''} 
                                                    onChange={e => onUpdate(index, 'ticketLabel', e.target.value)} 
                                                    placeholder="e.g. Add this ticket link (Story Sticker)" 
                                                    className="w-full h-10 bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-lg px-3 text-xs text-gray-900 dark:text-white" 
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-gray-400 font-mono uppercase block mb-1">Destination URL</span>
                                                <Input 
                                                    value={task.ticketLink || ''} 
                                                    onChange={e => onUpdate(index, 'ticketLink', e.target.value)} 
                                                    placeholder="https://in.bookmyshow.com/..." 
                                                    className="w-full h-10 bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-lg px-3 text-xs text-gray-900 dark:text-white font-mono" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Repost Poster / Creative Asset (e.g. Instagram poster or Drive assets) */}
                                    <div className="p-3 rounded-xl bg-white dark:bg-[#0c0e14] border border-black/10 dark:border-white/10 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5 font-mono">
                                                <Instagram size={13} className="text-purple-500" />
                                                2. Repost Poster / Creative Asset
                                            </label>
                                            {task.referencePostUrl && (
                                                <a href={task.referencePostUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-500 hover:underline flex items-center gap-1 font-mono">
                                                    <span>Open Post</span> <ExternalLink size={10} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-[9px] text-gray-400 font-mono uppercase block mb-1">Button Display Text</span>
                                                <Input 
                                                    value={task.referencePostLabel || ''} 
                                                    onChange={e => onUpdate(index, 'referencePostLabel', e.target.value)} 
                                                    placeholder="e.g. Repost this poster / Official Post" 
                                                    className="w-full h-10 bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-lg px-3 text-xs text-gray-900 dark:text-white" 
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-gray-400 font-mono uppercase block mb-1">Post or Asset URL</span>
                                                <Input 
                                                    value={task.referencePostUrl || ''} 
                                                    onChange={e => onUpdate(index, 'referencePostUrl', e.target.value)} 
                                                    placeholder="https://www.instagram.com/p/... or Drive URL" 
                                                    className="w-full h-10 bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-lg px-3 text-xs text-gray-900 dark:text-white font-mono" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Additional Custom Links */}
                                    {taskLinks.map((clink, cIdx) => (
                                        <div key={clink.id || cIdx} className="p-3 rounded-xl bg-white dark:bg-[#0c0e14] border border-black/10 dark:border-white/10 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5 font-mono">
                                                    <Link2 size={13} className="text-gray-400" />
                                                    Custom Link #{cIdx + 1}
                                                </label>
                                                <button type="button" onClick={() => handleRemoveCustomLink(cIdx)} className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 font-mono">
                                                    <X size={12} /> Remove
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <Input 
                                                    value={clink.label || ''} 
                                                    onChange={e => handleUpdateCustomLink(cIdx, 'label', e.target.value)} 
                                                    placeholder="Button Label (e.g. Guidelines PDF)" 
                                                    className="w-full h-10 bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-lg px-3 text-xs" 
                                                />
                                                <Input 
                                                    value={clink.url || ''} 
                                                    onChange={e => handleUpdateCustomLink(cIdx, 'url', e.target.value)} 
                                                    placeholder="https://..." 
                                                    className="w-full h-10 bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-lg px-3 text-xs font-mono" 
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <button 
                                        type="button" 
                                        onClick={handleAddCustomLink} 
                                        className="w-full h-9 rounded-xl border border-dashed border-black/20 dark:border-white/20 hover:border-neon-green/60 hover:text-emerald-600 dark:hover:text-neon-green text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 text-gray-500"
                                    >
                                        <Plus size={13} /> Add Another Link
                                    </button>
                                </div>
                            </div>

                            {/* ③ Task Instructions (Separate from Links) */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-neon-green font-black font-mono">③</span>
                                        <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                            Task Instructions & Rules
                                        </h5>
                                    </div>
                                    <span className="text-[9px] text-gray-400 font-mono hidden sm:inline">
                                        Different from links above
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                                    Write instructions, mention tags, and rules here. The action links configured above will appear as direct 1-tap mobile buttons.
                                </p>
                                <StudioRichEditor 
                                    label="" 
                                    value={task.description} 
                                    onChange={val => onUpdate(index, 'description', val)} 
                                    placeholder="e.g. Post 1 story with the ticket link sticker, tag @newbi.live, and keep it live for 24 hours..." 
                                    minHeight="100px" 
                                />

                                {/* Creative Image Upload */}
                                <div className="space-y-1.5 pt-2">
                                    <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest block">
                                        Creative Assets / Reference Images (Optional)
                                    </label>
                                    <div className="flex flex-wrap gap-2.5 items-center">
                                        {(task.creativeAssets || []).map((url, i) => (
                                            <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] group/asset">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => { const na = [...task.creativeAssets]; na.splice(i,1); onUpdate(index, 'creativeAssets', na); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover/asset:opacity-100 transition-opacity flex items-center justify-center text-white"><XCircle size={18} /></button>
                                            </div>
                                        ))}
                                        <label className="w-14 h-14 rounded-xl border-2 border-dashed border-black/[0.1] dark:border-white/[0.1] flex flex-col items-center justify-center cursor-pointer hover:border-neon-green hover:text-neon-green transition-all bg-white dark:bg-black/40 text-gray-400">
                                            <input type="file" className="hidden" onChange={e => onUploadCreative(index, e)} />
                                            {isUploading ? <LoadingSpinner size="xs" color="#39ff14" /> : <Plus size={18} />}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

export default CampaignManager;
