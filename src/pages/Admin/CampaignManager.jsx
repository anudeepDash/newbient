import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { notifySpecificUser, notifyAllUsers } from '../../lib/notificationTriggers';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
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

/* --- Redesigned Sub-components --- */

const StatCard = ({ icon, label, value, color, description, compact = false }) => {
    const colorMap = {
        blue: { bg: 'bg-neon-blue/10', border: 'border-neon-blue/20', text: 'text-neon-blue', glow: 'rgba(46,191,255,0.2)', gradient: 'from-neon-blue/20 to-transparent' },
        green: { bg: 'bg-neon-green/10', border: 'border-neon-green/20', text: 'text-neon-green', glow: 'rgba(57,255,20,0.2)', gradient: 'from-neon-green/20 to-transparent' },
        yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-500', glow: 'rgba(234,179,8,0.2)', gradient: 'from-yellow-500/20 to-transparent' },
        purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500', glow: 'rgba(168,85,247,0.2)', gradient: 'from-purple-500/20 to-transparent' }
    };
    
    const theme = colorMap[color] || colorMap.blue;
    
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className={cn(
                "relative group overflow-hidden bg-[#0A0A0A] border transition-all duration-500 flex-1",
                compact ? "p-4 md:p-5 rounded-[2rem] min-w-[200px]" : "p-8 rounded-[3rem] min-w-[280px]",
                theme.border
            )}
            style={{ boxShadow: compact ? `0 10px 30px -10px ${theme.glow}` : `0 20px 50px -10px ${theme.glow}` }}
        >
            <div className={cn("absolute top-0 right-0 w-40 h-40 bg-gradient-to-br blur-[80px] -mr-20 -mt-20 opacity-30 group-hover:opacity-50 transition-opacity", theme.gradient)} />
            <div className={cn("relative z-10 flex h-full", compact ? "flex-row items-center gap-4" : "flex-col justify-between gap-8")}>
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "rounded-2xl flex items-center justify-center shadow-inner border border-white/5 shrink-0", 
                        compact ? "w-10 h-10 md:w-12 md:h-12" : "w-16 h-16",
                        theme.bg, theme.text
                    )}>
                        {React.cloneElement(icon, { size: compact ? 18 : 24 })}
                    </div>
                    {!compact && (
                        <div className="text-right">
                            <TrendingUp size={16} className={cn("inline-block mr-2", theme.text)} />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">+15%</span>
                        </div>
                    )}
                </div>
                <div className={cn("space-y-1", compact ? "flex-1" : "")}>
                    <p className={cn("font-black uppercase tracking-[0.4em] leading-tight text-gray-500", compact ? "text-[8px]" : "text-[10px]")}>{label}</p>
                    <h3 className={cn("font-black text-white tracking-tighter tabular-nums leading-none", compact ? "text-2xl" : "text-6xl")}>{value}</h3>
                    {!compact && description && (
                        <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mt-2">{description}</p>
                    )}
                </div>
            </div>
            {!compact && (
                <div className={cn("absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20", theme.text)} />
            )}
        </motion.div>
    );
};

const CampaignBadgeCard = ({ campaign, onSelect, onEdit, onDelete, onCopyLink }) => (
    <motion.div 
        layout
        onClick={onSelect}
        className="group relative bg-[#0A0A0A] border border-white/5 hover:border-neon-blue/40 rounded-[2rem] sm:rounded-[3.5rem] p-5 sm:p-6 cursor-pointer overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col h-auto sm:h-[520px]"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 via-transparent to-neon-pink/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="relative mb-6 group-hover:scale-[1.01] transition-transform duration-700">
            <div className="aspect-video rounded-[2.5rem] overflow-hidden bg-black border border-white/5 relative flex items-center justify-center">
                {campaign.thumbnail ? (
                    <img src={campaign.thumbnail} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                ) : (
                    <div className="text-4xl font-black text-white/[0.03] uppercase italic select-none">
                        MISSION ALPHA
                    </div>
                )}
                <div className="absolute top-4 right-4">
                    <StatusPill status={campaign.status} />
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col px-2">
            <div className="h-28 mb-4">
                <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] mb-2">ACTIVE MISSION</p>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-[0.9] group-hover:text-neon-blue transition-colors duration-500 line-clamp-2">
                    {campaign.title}
                </h3>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] bg-white/[0.03] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                    <MapPin size={12} className="text-neon-pink animate-pulse" />
                    <span>{campaign.targetCity || 'GLOBAL'}</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-500/80 text-[10px] font-black uppercase tracking-[0.2em] bg-yellow-500/5 px-4 py-2.5 rounded-2xl border border-yellow-500/10 shadow-inner w-fit">
                    <Zap size={12} className="text-yellow-500" />
                    <span>{campaign.tasks?.length || 0} OPERATIONAL UNITS</span>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                <div>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1.5">REWARD PACKAGE</p>
                    <p className="text-xl font-black text-white tracking-tighter truncate max-w-[180px]">{campaign.reward}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const newStatus = campaign.status === 'Open' ? 'Closed' : 'Open';
                            useStore.getState().updateCampaign(campaign.id, { ...campaign, status: newStatus });
                        }}
                        className={cn(
                            "w-10 h-10 rounded-xl border transition-all flex items-center justify-center",
                            campaign.status === 'Open' ? "bg-white/5 border-white/5 text-neon-green hover:bg-neon-green hover:text-black" : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                        )}
                        title={campaign.status === 'Open' ? "Close Mission" : "Open Mission"}
                    >
                        {campaign.status === 'Open' ? <Unlock size={16} /> : <Lock size={16} />}
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-neon-blue hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all">
                        <ChevronRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);

const CampaignListItem = ({ campaign, idx, onSelect, onEdit, onCopyLink }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.03 }}
        onClick={onSelect}
        className="group flex flex-col sm:flex-row items-start sm:items-center p-5 sm:px-8 sm:py-5 bg-[#080808]/40 backdrop-blur-xl border border-white/5 hover:border-white/10 hover:bg-[#0A0A0A]/80 rounded-[2rem] cursor-pointer transition-all duration-300 gap-4 sm:gap-6"
    >
        <div className="w-16">
            <div className="w-14 h-14 bg-black border border-white/10 rounded-2xl flex items-center justify-center font-black text-white group-hover:border-neon-blue/40 overflow-hidden transition-colors group-hover:scale-105 transition-transform">
                {campaign.thumbnail ? (
                    <img src={campaign.thumbnail} alt={campaign.title} className="w-full h-full object-cover" />
                ) : (
                    <Target size={20} className="text-white/10" />
                )}
            </div>
        </div>
        
        <div className="flex-1 w-full sm:w-auto">
            <h4 className="text-lg font-black text-white uppercase italic tracking-tight group-hover:text-neon-blue transition-colors truncate mb-1">{campaign.title}</h4>
            <div className="flex items-center gap-3">
                <p className="text-[9px] text-gray-600 font-black tracking-[0.2em] flex items-center gap-1.5 uppercase">
                    <MapPin size={10} className="text-neon-pink" /> {campaign.targetCity}
                </p>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <p className="text-[9px] text-neon-pink font-black uppercase tracking-widest">{campaign.reward}</p>
            </div>
        </div>

        <div className="w-48 hidden md:block">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 bg-white/5 border border-white/5 px-4 py-2 rounded-xl group-hover:bg-white/10 transition-colors">
                ACTIVE MISSION
            </span>
        </div>

        <div className="w-40 hidden lg:block text-right pr-10">
            <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1">OPERATIONAL UNITS</p>
            <p className="text-lg font-black text-white font-mono">{campaign.tasks?.length || 0}</p>
        </div>

        <div className="hidden sm:flex w-32 items-center justify-end">
            <StatusPill status={campaign.status} />
        </div>

        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/5 border border-white/5 items-center justify-center group-hover:bg-white group-hover:text-black transition-all group-hover:scale-110">
            <ChevronRight size={20} />
        </div>
    </motion.div>
);

const StatusPill = ({ status }) => {
    const config = {
        Open: "bg-neon-green/10 text-neon-green border-neon-green/30",
        Closed: "bg-red-500/10 text-red-500 border-red-500/30",
        Archive: "bg-gray-500/10 text-gray-500 border-gray-500/30"
    };
    const style = config[status] || config.Open;
    return (
        <span className={cn("px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border backdrop-blur-md", style)}>
            {status || 'OPEN'}
        </span>
    );
};

/* --- Main Campaign Manager Component --- */

const CampaignManager = ({ isEmbedded = false }) => {
    const { campaigns, addCampaign, updateCampaign, deleteCampaign, user, uploadToCloudinary } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [expandedCampaignId, setExpandedCampaignId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingTaskAsset, setIsUploadingTaskAsset] = useState(false);
    const [modalTab, setModalTab] = useState('applicants'); 
    const [rejectionModal, setRejectionModal] = useState(null); 
    const [rejectionReason, setRejectionReason] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

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
        tasks: [],
        isPinned: false
    });

    const [isProcessingCSV, setIsProcessingCSV] = useState(false);

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c =>
            (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.targetCity || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [campaigns, searchTerm]);

    const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
    const paginatedCampaigns = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCampaigns.slice(start, start + itemsPerPage);
    }, [filteredCampaigns, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const stats = useMemo(() => {
        const activeCount = campaigns.filter(c => c.status === 'Open').length;
        const totalTasksCreated = campaigns.reduce((acc, c) => acc + (c.tasks?.length || 0), 0);
        const totalPendingReviews = campaigns.reduce((acc, c) => {
            return acc + (c.tasks || []).reduce((tAcc, t) => {
                return tAcc + Object.values(t.submissions || {}).filter(sub => sub.status === 'submitted').length;
            }, 0);
        }, 0);

        return {
            total: campaigns.length,
            active: activeCount,
            tasks: totalTasksCreated,
            pending: totalPendingReviews
        };
    }, [campaigns]);

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
            tasks: [],
            isPinned: false
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
            useStore.getState().addToast("UPLOAD FAILED.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateCampaign(editingId, formData);
                // Notification logic handled in original code
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
            useStore.getState().addToast("Storage error.", 'error');
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
            thumbnail: campaign.thumbnail || '',
            isPinned: campaign.isPinned || false
        });
        setEditingId(campaign.id);
        setIsCreating(true);
    };

    const handleCopyLink = (id) => {
        const url = `${window.location.origin}/campaign/${id}`;
        navigator.clipboard.writeText(url);
        useStore.getState().addToast("Campaign link copied to clipboard!", 'success');
    };

    const handleToggleShortlist = async (creatorUid, campaignId) => {
        try {
            const isShortlisting = !useStore.getState().creators.find(c => c.uid === creatorUid)?.shortlistedCampaigns?.includes(campaignId);
            await useStore.getState().toggleShortlistStatus(campaignId, creatorUid);
            
            if (isShortlisting) {
                const campaign = campaigns.find(c => c.id === campaignId);
                await notifySpecificUser(
                    creatorUid,
                    'CAMPAIGN SELECTION',
                    `CONGRATULATIONS! YOU HAVE BEEN SELECTED FOR "${campaign.title.toUpperCase()}". VIEW YOUR TASKS IN YOUR CREATOR STUDIO.`,
                    '/creator-dashboard',
                    'campaign'
                );
            }
        } catch (error) {
            useStore.getState().addToast("Failed to toggle shortlist.", 'error');
        }
    };

    const handleReviewSubmission = async (campaignId, taskId, creatorUid, status) => {
        try {
            if (status === 'rejected') {
                setRejectionModal({ campaignId, taskId, creatorUid });
                return;
            }
            await useStore.getState().reviewTaskSubmission(campaignId, taskId, creatorUid, status);
            
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
            useStore.getState().addToast("Review failed.", 'error');
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
            useStore.getState().addToast("Rejection failed.", 'error');
        }
    };

    const renderContent = () => (
        <div className="relative z-10 max-w-[1700px] mx-auto pb-20">
            {/* Header Section */}
            <div className={cn(
                "flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 md:gap-10 mb-8 md:mb-12",
                isEmbedded ? "pt-8 px-0" : "pt-32 md:pt-48 px-4 md:px-12"
            )}>
                {!isEmbedded ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-neon-blue font-black tracking-[0.5em] text-[10px] uppercase">
                            <Layers size={14} />
                            Administrative Campaign Hub
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tighter uppercase italic leading-[0.8]">
                            MISSION <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500">OPERATIONS.</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-medium tracking-wide max-w-xl leading-relaxed">
                            Deploy and manage strategic creator missions. Monitor real-time task submissions, verify content, and orchestrate global followers.
                        </p>
                        <div className="pt-4">
                            <AdminDashboardLink />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
                            <Target size={24} className="text-neon-blue" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">CAMPAIGN <span className="text-neon-blue">OVERVIEW</span></h2>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Monitor and manage your active mission performance</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
                    <StatCard compact={isEmbedded} icon={<Zap size={24} />} label="LIVE MISSIONS" value={stats.active} color="green" description={`${stats.total} Total Units`} />
                    <StatCard compact={isEmbedded} icon={<Clock size={24} />} label="PENDING REVIEW" value={stats.pending} color="yellow" description="Awaiting Task Verification" />
                </div>
            </div>

            <div className={cn("px-4 md:px-12", isEmbedded ? "pt-12" : "pt-0")}>
                {/* Control Panel */}
                {!isCreating && (
                    <div className="relative z-50 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2.5 mb-8 md:mb-16 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col xl:flex-row xl:items-center gap-2 md:gap-3">
                        
                        {/* Search Engine */}
                        <div className="relative flex-1 min-w-[280px] group">
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full pointer-events-none" />
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-blue transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="SEARCH MISSIONS..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-14 pl-14 pr-6 bg-black/60 border border-white/10 group-hover:border-white/20 focus:border-neon-blue/60 rounded-full text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-all placeholder:text-gray-700 text-white min-w-0"
                            />
                        </div>

                        {/* View Switcher */}
                        <div className="hidden md:flex bg-black/60 p-1 rounded-full border border-white/10 shrink-0">
                            <button 
                                onClick={() => setViewMode('grid')} 
                                className={cn(
                                    "w-11 h-11 rounded-full flex items-center justify-center transition-all", 
                                    viewMode === 'grid' ? "bg-white text-black shadow-xl" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={cn(
                                    "w-11 h-11 rounded-full flex items-center justify-center transition-all", 
                                    viewMode === 'list' ? "bg-white text-black shadow-xl" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <FileSpreadsheet size={16} />
                            </button>
                        </div>

                        <button 
                            onClick={() => { resetForm(); setIsCreating(true); }}
                            className="group relative h-12 md:h-14 px-4 md:px-8 bg-white text-black rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] overflow-hidden hover:scale-[1.02] active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 w-full xl:w-auto shrink-0"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-500">
                                <Plus size={16} />
                                NEW MISSION
                            </div>
                        </button>
                    </div>
                )}

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
                                <div className="flex justify-between items-center mb-10">
                                    <div className="flex items-center gap-6">
                                        <button onClick={resetForm} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                            <ArrowLeft size={20} />
                                        </button>
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                                            {editingId ? 'EDIT' : 'NEW'} <span className="text-neon-blue">MISSION BRIEF</span>
                                        </h2>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={resetForm} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Discard</button>
                                        <button onClick={handleSubmit} className="h-12 px-10 bg-white text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all">DEPLOΥ</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-7 space-y-8">
                                        <Card className="p-8 md:p-10 bg-[#0A0A0A]/60 backdrop-blur-3xl border-white/5 rounded-[2.5rem] shadow-2xl space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">MISSION TITLE</label>
                                                    <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Summer Brand Rush" className="h-14 bg-black/50 border-white/10 rounded-2xl" />
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
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">MISSION THUMBNAIL</label>
                                                <div className="flex gap-4 items-center">
                                                    {formData.thumbnail && (
                                                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                                                            <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <label className="flex-1 h-20 bg-black/30 border-2 border-dashed border-white/10 hover:border-neon-blue/30 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center group">
                                                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                                        <div className="flex items-center gap-3">
                                                            <ImageIcon size={18} className="text-gray-500 group-hover:text-neon-blue transition-colors" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-white transition-colors">{isUploading ? 'UPLOADING...' : 'Upload Mission Asset'}</span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>

                                            <StudioRichEditor 
                                                label="OPERATIONAL BRIEF"
                                                required
                                                value={formData.description}
                                                onChange={val => setFormData({ ...formData, description: val })}
                                                placeholder="Describe the mission requirements and goals..."
                                                minHeight="180px"
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">REWARD DETAIL</label>
                                                    <Input required value={formData.reward} onChange={e => setFormData({ ...formData, reward: e.target.value })} placeholder="e.g. ₹5,000 + Products" className="h-14 bg-black/50 border-white/10 rounded-2xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">MIN FOLLOWERS</label>
                                                    <Input type="number" required value={formData.minInstagramFollowers} onChange={e => setFormData({ ...formData, minInstagramFollowers: parseInt(e.target.value) })} placeholder="e.g. 5000" className="h-14 bg-black/50 border-white/10 rounded-2xl" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">COMMUNICATION HUB (WHATSAPP)</label>
                                                <Input value={formData.whatsappLink} onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." className="h-14 bg-black/50 border-white/10 rounded-2xl" />
                                            </div>

                                            <div className={cn(
                                                "p-8 rounded-[2rem] border flex items-center justify-between transition-all duration-500", 
                                                formData.isPinned ? "bg-neon-blue/10 border-neon-blue/40 shadow-[0_0_40px_rgba(46,191,255,0.05)]" : "bg-black/40 border-white/5"
                                            )}>
                                                <div className="flex items-center gap-8">
                                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl", formData.isPinned ? "bg-neon-blue text-black" : "bg-white/5 text-gray-600")}>
                                                        <Star size={24} className={cn(formData.isPinned && "fill-current")} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white text-sm font-black uppercase tracking-widest italic leading-tight">FEATURE AS SPOTLIGHT</h4>
                                                        <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-[0.1em]">SHOW IN THE FEATURED SECTION AT TOP</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })} 
                                                    className={cn("w-14 h-8 rounded-full relative transition-all border-2", formData.isPinned ? "bg-neon-blue border-neon-blue" : "bg-black/60 border-white/10")}
                                                >
                                                    <div className={cn("absolute top-1 w-5 h-5 rounded-full transition-all shadow-lg", formData.isPinned ? "right-1 bg-black" : "left-1 bg-gray-600")} />
                                                </button>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="lg:col-span-5 space-y-8">
                                        <Card className="p-8 md:p-10 bg-[#0A0A0A]/60 backdrop-blur-3xl border-white/5 rounded-[2.5rem] shadow-2xl">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                                    <Zap size={18} className="text-neon-blue" /> MISSION TASKS
                                                </h3>
                                                <button type="button" onClick={() => setFormData({ ...formData, tasks: [...formData.tasks, { id: Date.now().toString(), title: '', description: '', taskType: 'custom', platform: 'instagram', priority: 'required', creativeAssets: [], creativeLinks: [], submissions: {} }] })} className="h-10 px-5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                                    + Add Unit
                                                </button>
                                            </div>

                                            <div className="space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                                                {formData.tasks.map((task, index) => (
                                                    <TaskEditorCard 
                                                        key={task.id}
                                                        task={task}
                                                        index={index}
                                                        totalTasks={formData.tasks.length}
                                                        onUpdate={(idx, field, val) => {
                                                            const newTasks = [...formData.tasks];
                                                            newTasks[idx] = { ...newTasks[idx], [field]: val };
                                                            setFormData({ ...formData, tasks: newTasks });
                                                        }}
                                                        onRemove={() => {
                                                            const newTasks = [...formData.tasks];
                                                            newTasks.splice(index, 1);
                                                            setFormData({ ...formData, tasks: newTasks });
                                                        }}
                                                        onMoveUp={() => {
                                                            if (index === 0) return;
                                                            const newTasks = [...formData.tasks];
                                                            [newTasks[index], newTasks[index-1]] = [newTasks[index-1], newTasks[index]];
                                                            setFormData({ ...formData, tasks: newTasks });
                                                        }}
                                                        onMoveDown={() => {
                                                            if (index === formData.tasks.length - 1) return;
                                                            const newTasks = [...formData.tasks];
                                                            [newTasks[index], newTasks[index+1]] = [newTasks[index+1], newTasks[index]];
                                                            setFormData({ ...formData, tasks: newTasks });
                                                        }}
                                                        onUploadCreative={async (idx, e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            setIsUploadingTaskAsset(true);
                                                            try {
                                                                const url = await uploadToCloudinary(file);
                                                                const tasks = [...formData.tasks];
                                                                tasks[idx] = { ...tasks[idx], creativeAssets: [...(tasks[idx].creativeAssets || []), url] };
                                                                setFormData({ ...formData, tasks });
                                                            } catch (err) {
                                                                useStore.getState().addToast("Upload failed", 'error');
                                                            } finally {
                                                                setIsUploadingTaskAsset(false);
                                                            }
                                                        }}
                                                        isUploading={isUploadingTaskAsset}
                                                    />
                                                ))}
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            </motion.div>
                        ) : campaigns.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="py-40 text-center bg-[#050505]/40 rounded-[4rem] border border-white/5 flex flex-col items-center gap-8 shadow-inner"
                            >
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 animate-pulse">
                                    <Target size={48} className="text-gray-700" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-500 italic">No Missions Found</h3>
                                    <p className="text-gray-700 text-sm font-black uppercase tracking-widest">Deploy a mission to begin operations</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={viewMode}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {viewMode === 'grid' ? (
                                    <div className="relative group/carousel">
                                        {/* Scroll Indicators */}
                                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex opacity-0 group-hover/carousel:opacity-100 transition-opacity pointer-events-none">
                                            <button onClick={() => scrollContainer('campaign-grid', 'left')} className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white pointer-events-auto hover:bg-white hover:text-black transition-all shadow-2xl">
                                                <ChevronRight className="rotate-180" size={24} />
                                            </button>
                                        </div>
                                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex opacity-0 group-hover/carousel:opacity-100 transition-opacity pointer-events-none">
                                            <button onClick={() => scrollContainer('campaign-grid', 'right')} className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white pointer-events-auto hover:bg-white hover:text-black transition-all shadow-2xl">
                                                <ChevronRight size={24} />
                                            </button>
                                        </div>

                                        <div 
                                            id="campaign-grid" 
                                            className="flex md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 items-start overflow-x-auto md:overflow-visible pb-8 md:pb-0 snap-x horizontal-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
                                        >
                                            {paginatedCampaigns.map((campaign, idx) => (
                                                <motion.div
                                                    key={campaign.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="w-[280px] sm:w-full shrink-0 snap-center md:snap-none"
                                                >
                                                    <CampaignBadgeCard 
                                                        campaign={campaign} 
                                                        onSelect={() => setExpandedCampaignId(campaign.id)}
                                                        onEdit={() => handleEdit(campaign)}
                                                        onDelete={() => deleteCampaign(campaign.id)}
                                                        onCopyLink={() => handleCopyLink(campaign.id)}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-6 px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] border-b border-white/5">
                                            <div className="w-16 shrink-0">Asset</div>
                                            <div className="flex-1 pl-1">Mission Brief</div>
                                            <div className="w-48 hidden md:block">Status</div>
                                            <div className="w-40 hidden lg:block text-right pr-10">Unit Units</div>
                                            <div className="w-12 shrink-0"></div>
                                        </div>
                                        {paginatedCampaigns.map((campaign, idx) => (
                                            <CampaignListItem 
                                                key={campaign.id}
                                                campaign={campaign}
                                                idx={idx}
                                                onSelect={() => setExpandedCampaignId(campaign.id)}
                                                onEdit={() => handleEdit(campaign)}
                                                onCopyLink={() => handleCopyLink(campaign.id)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-4 mt-16 pb-12">
                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all">
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="flex gap-2">
                                            {[...Array(totalPages)].map((_, i) => (
                                                <button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-12 h-12 rounded-2xl font-black border transition-all", currentPage === i + 1 ? "bg-white text-black" : "bg-white/5 text-gray-500 border-white/10")}>{i + 1}</button>
                                            ))}
                                        </div>
                                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {!isEmbedded && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(46,191,255,0.08),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_30%,transparent_100%)]" />
                    <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
            )}
            {renderContent()}
            
            <AnimatePresence>
                {expandedCampaignId && (
                    <CampaignDetailModal 
                        campaignId={expandedCampaignId}
                        onClose={() => setExpandedCampaignId(null)}
                        onEdit={(c) => { handleEdit(c); setExpandedCampaignId(null); }}
                        onToggleShortlist={handleToggleShortlist}
                        onReviewSubmission={handleReviewSubmission}
                    />
                )}
                {rejectionModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-6">REJECTION FEEDBACK</h3>
                            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Provide specific reasons for rejection..." className="w-full h-40 bg-black border border-white/10 rounded-2xl p-6 text-sm text-white focus:border-red-500/50 outline-none transition-all resize-none mb-6" />
                            <div className="flex gap-4">
                                <button onClick={() => setRejectionModal(null)} className="flex-1 h-14 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                                <button onClick={confirmRejection} className="flex-1 h-14 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">Confirm Rejection</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

/* --- Detailed Mission Modal --- */

const CampaignDetailModal = ({ campaignId, onClose, onEdit, onToggleShortlist, onReviewSubmission }) => {
    const { campaigns, creators } = useStore();
    const campaign = campaigns.find(c => c.id === campaignId);
    const [activeTab, setActiveTab] = useState('applicants'); // applicants | tasks

    if (!campaign) return null;

    const appliedCreators = creators.filter(c => (c.joinedCampaigns || []).includes(campaign.id));
    const approvedCreators = appliedCreators.filter(c => (c.shortlistedCampaigns || []).includes(campaign.id));

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className="relative bg-[#050505] border border-white/10 rounded-[3rem] w-full max-w-7xl h-full md:h-[90vh] overflow-hidden flex flex-col shadow-[0_50px_150px_rgba(0,0,0,1)]"
            >
                {/* Header Section */}
                <div className="p-10 md:p-14 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shrink-0 bg-[#0A0A0A]/40">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <StatusPill status={campaign.status} />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">DEPLOYMENT ID: {campaign.id.slice(0, 8)}</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">{campaign.title}</h2>
                        <div className="flex items-center gap-4 text-neon-blue font-black text-[11px] uppercase tracking-widest">
                            <MapPin size={14} /> {campaign.targetCity}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => onEdit(campaign)} className="h-14 px-10 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all">EDIT MISSION</button>
                        <button onClick={onClose} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group">
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-10 md:px-14 py-6 border-b border-white/5 flex gap-10 shrink-0">
                    {['applicants', 'tasks'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "relative py-4 text-[11px] font-black uppercase tracking-[0.3em] transition-colors",
                                activeTab === tab ? "text-white" : "text-gray-500 hover:text-white"
                            )}
                        >
                            {tab === 'applicants' ? `APPLICATIONS (${appliedCreators.length})` : `MISSION TASKS (${campaign.tasks?.length || 0})`}
                            {activeTab === tab && <motion.div layoutId="modal-tab-line" className="absolute bottom-0 left-0 right-0 h-1 bg-neon-blue rounded-full shadow-[0_0_10px_rgba(46,191,255,0.5)]" />}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 md:p-14">
                    {activeTab === 'applicants' ? (
                        <div className="space-y-6">
                            {appliedCreators.length === 0 ? (
                                <div className="py-32 text-center flex flex-col items-center gap-6 opacity-40">
                                    <Users size={64} />
                                    <p className="text-xl font-black uppercase tracking-tighter">No Applications Received Yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                                    {appliedCreators.map(creator => {
                                        const isShortlisted = (creator.shortlistedCampaigns || []).includes(campaign.id);
                                        return (
                                            <div key={creator.uid} className={cn("p-8 rounded-[2.5rem] border transition-all duration-500 group relative overflow-hidden", isShortlisted ? "bg-neon-blue/5 border-neon-blue/20" : "bg-white/[0.02] border-white/5 hover:border-white/20")}>
                                                <div className="flex items-start justify-between mb-8">
                                                    <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-xl font-black italic">{creator.name.charAt(0)}</div>
                                                    <button 
                                                        onClick={() => onToggleShortlist(creator.uid, campaign.id)}
                                                        className={cn(
                                                            "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                                                            isShortlisted ? "bg-neon-blue text-white border-neon-blue shadow-[0_0_20px_rgba(46,191,255,0.3)]" : "bg-white/5 text-gray-500 border-white/10 hover:text-white hover:border-white/30"
                                                        )}
                                                    >
                                                        {isShortlisted ? 'SHORTLISTED' : 'SHORTLIST'}
                                                    </button>
                                                </div>
                                                <h4 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">{creator.name}</h4>
                                                <div className="flex items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                    <Instagram size={14} className="text-neon-pink" /> {Number(creator.instagramFollowers || 0).toLocaleString()} FOLLOWERS
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {(campaign.tasks || []).map((task, idx) => (
                                <div key={task.id} className="space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-neon-blue">{idx + 1}</div>
                                        <div>
                                            <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">{task.title}</h4>
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">{task.platform} UNIT</p>
                                        </div>
                                    </div>

                                    {/* Task Verification Dashboard */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden">
                                        <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                                            <h5 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">OPERATIONAL VERIFICATION</h5>
                                            <div className="px-4 py-1.5 bg-neon-blue/10 rounded-full text-[8px] font-black text-neon-blue uppercase tracking-widest border border-neon-blue/20">Awaiting {Object.values(task.submissions || {}).filter(s => s.status === 'submitted').length} Reviews</div>
                                        </div>
                                        <div className="p-8 space-y-6">
                                            {approvedCreators.length === 0 ? (
                                                <p className="text-center py-10 text-gray-700 text-[10px] font-black uppercase tracking-widest italic">No shortlisted operators assigned to this unit.</p>
                                            ) : approvedCreators.map(creator => {
                                                const sub = task.submissions?.[creator.uid];
                                                const status = sub?.status || 'not_started';
                                                
                                                return (
                                                    <div key={creator.uid} className="flex items-center justify-between p-6 bg-black/40 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-all">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black italic">{creator.name.charAt(0)}</div>
                                                            <div>
                                                                <p className="text-sm font-black text-white uppercase italic">{creator.name}</p>
                                                                <p className={cn("text-[9px] font-black uppercase tracking-widest", 
                                                                    status === 'approved' ? "text-neon-green" : 
                                                                    status === 'submitted' ? "text-neon-blue" : 
                                                                    status === 'rejected' ? "text-red-500" : "text-gray-700"
                                                                )}>{status.replace('_', ' ')}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            {sub?.submissionUrl && (
                                                                <a href={sub.submissionUrl} target="_blank" rel="noreferrer" className="h-12 px-6 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white hover:text-black transition-all">
                                                                    <ExternalLink size={14} /> VIEW CONTENT
                                                                </a>
                                                            )}
                                                            {status === 'submitted' && (
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => onReviewSubmission(campaign.id, task.id, creator.uid, 'approved')} className="w-12 h-12 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/30 flex items-center justify-center hover:bg-neon-green hover:text-black transition-all"><Check size={18} /></button>
                                                                    <button onClick={() => onReviewSubmission(campaign.id, task.id, creator.uid, 'rejected')} className="w-12 h-12 rounded-xl bg-red-500/20 text-red-500 border border-red-500/30 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><X size={18} /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

/* --- Task Editor Sub-component --- */

const TaskEditorCard = ({ task, index, totalTasks, onUpdate, onRemove, onMoveUp, onMoveDown, onUploadCreative, isUploading }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const TaskTypeIcon = getTaskTypeIcon(task.taskType);
    const PlatformIcon = getPlatformIcon(task.platform);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            layout
            className="bg-black/60 border border-white/10 rounded-[2rem] relative group overflow-hidden shadow-xl"
        >
            <div className={cn("absolute top-0 left-0 w-full h-1", task.priority === 'required' ? 'bg-neon-blue shadow-[0_0_10px_rgba(46,191,255,0.3)]' : 'bg-white/10')} />

            <div className="flex items-center gap-4 p-6 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col gap-1">
                        <button type="button" onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} className="text-gray-700 hover:text-white disabled:opacity-20 transition-colors"><ArrowUp size={12} /></button>
                        <button type="button" onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={index === totalTasks - 1} className="text-gray-700 hover:text-white disabled:opacity-20 transition-colors"><ArrowDown size={12} /></button>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center">
                        <TaskTypeIcon size={20} className="text-neon-blue" />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <p className="text-[13px] font-black text-white uppercase tracking-tight truncate">{task.title || `Task Unit ${index + 1}`}</p>
                        {task.priority === 'required' && <span className="px-3 py-1 bg-neon-blue/10 border border-neon-blue/20 rounded-full text-[7px] font-black uppercase tracking-widest text-neon-blue">CRITICAL</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                        <PlatformIcon size={12} className="text-gray-600" />
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{task.platform}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => onRemove()} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"><Trash2 size={16} /></button>
                    <ChevronDown size={20} className={cn("text-gray-600 transition-transform duration-500", isExpanded && "rotate-180")} />
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-6 pb-8 space-y-6 border-t border-white/5 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Unit Title</label>
                                    <Input required value={task.title} onChange={e => onUpdate(index, 'title', e.target.value)} placeholder="e.g. Instagram Reel" className="h-12 bg-black/40 border-white/10 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Platform</label>
                                    <StudioSelect value={task.platform || 'instagram'} options={PLATFORMS.map(p => ({ value: p.value, label: p.label.toUpperCase() }))} onChange={val => onUpdate(index, 'platform', val)} className="h-12" accentColor="neon-blue" />
                                </div>
                            </div>

                            <StudioRichEditor label="Unit Brief" value={task.description} onChange={val => onUpdate(index, 'description', val)} placeholder="Describe what the creator should do..." minHeight="120px" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Priority</label>
                                    <div className="flex gap-2">
                                        {['required', 'optional'].map(p => (
                                            <button key={p} type="button" onClick={() => onUpdate(index, 'priority', p)} className={cn("flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", task.priority === p ? "bg-neon-blue text-black border-neon-blue" : "bg-black/40 border-white/10 text-gray-600 hover:text-white")}>{p}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Asset Delivery (Optional)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(task.creativeAssets || []).map((url, i) => (
                                            <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => { const na = [...task.creativeAssets]; na.splice(i,1); onUpdate(index, 'creativeAssets', na); }} className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"><XCircle size={14} /></button>
                                            </div>
                                        ))}
                                        <label className="w-12 h-12 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-neon-blue/40 transition-all">
                                            <input type="file" className="hidden" onChange={e => onUploadCreative(index, e)} />
                                            <Plus size={14} className="text-gray-600" />
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
};

export default CampaignManager;
