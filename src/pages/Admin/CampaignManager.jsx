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
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCSV, CSVUploadButton } from '../../components/admin/CSVHandler';
import { cn } from '../../lib/utils';
import LivePreview from '../../components/admin/LivePreview';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioSelect from '../../components/ui/StudioSelect';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';

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

const CampaignBadgeCard = ({ campaign, onSelect, onEdit, onDelete, updateCampaign, onCopyLink, isUpdating }) => (
    <motion.div 
        layout
        onClick={onSelect}
        className="group relative bg-[#0A0A0A] border border-white/5 hover:border-neon-blue/40 rounded-[2.5rem] p-5 sm:p-6 cursor-pointer overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col h-auto min-h-[510px]"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 via-transparent to-neon-pink/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="relative mb-6 group-hover:scale-[1.01] transition-transform duration-700">
            <div className="aspect-video rounded-[1.5rem] overflow-hidden bg-black border border-white/5 relative flex items-center justify-center">
                {campaign.thumbnail ? (
                    <img src={campaign.thumbnail} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm">
                    <div className="text-2xl font-black text-white/5 uppercase italic select-none tracking-[0.2em]">
                            CAMPAIGN IMAGE
                        </div>
                    </div>
                )}
                <div className="absolute top-4 right-4">
                    <StatusPill status={campaign.status} />
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col px-1">
            <div className="mb-6">
                <p className="text-[9px] font-black text-neon-blue uppercase tracking-[0.4em] mb-2 opacity-60">CAMPAIGN</p>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-[0.9] group-hover:text-neon-blue transition-colors duration-500 line-clamp-2">
                    {campaign.title}
                </h3>
            </div>

            <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] bg-white/[0.03] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                    <MapPin size={12} className="text-neon-pink animate-pulse" />
                    <span>{campaign.targetCity || 'GLOBAL'}</span>
                </div>
                <div className="flex items-center gap-3 text-yellow-500/80 text-[10px] font-black uppercase tracking-[0.2em] bg-yellow-500/5 px-4 py-2.5 rounded-2xl border border-yellow-500/10 shadow-inner w-fit">
                    <Zap size={12} className="text-yellow-500" />
                    <span>{campaign.tasks?.length || 0} TASKS</span>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 pr-2">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">REWARDS</p>
                        <p className="text-xl font-black text-neon-green tracking-tighter uppercase italic truncate">{campaign.reward}</p>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                        className="flex items-center gap-1.5 px-4 h-11 rounded-2xl bg-white text-black hover:bg-neon-blue hover:text-black transition-all text-[10px] font-black uppercase tracking-widest group/btn shadow-xl backdrop-blur-3xl shrink-0"
                        title="View Campaign Page"
                    >
                        <span>MANAGE</span>
                        <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-4 border-t border-white/5 bg-white/[0.01] -mx-2 px-2 py-2 rounded-2xl">
                    <div className="flex items-center gap-1.5">
                        <button 
                            disabled={isUpdating}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isUpdating) return;
                                if (window.confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
                                    onDelete(campaign.id);
                                }
                            }}
                            className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-xl backdrop-blur-3xl disabled:opacity-50"
                            title="Delete Campaign"
                        >
                            <Trash2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onCopyLink();
                            }}
                            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-neon-blue hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all flex items-center justify-center shadow-xl backdrop-blur-3xl"
                            title="Share Campaign"
                        >
                            <Share2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(campaign);
                            }}
                            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-neon-blue hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all flex items-center justify-center shadow-xl backdrop-blur-3xl"
                            title="Edit Campaign"
                        >
                            <Edit size={16} />
                        </button>
                    </div>
                    <button 
                        disabled={isUpdating}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isUpdating) return;
                            const newStatus = campaign.status === 'Open' ? 'Closed' : 'Open';
                            updateCampaign(campaign.id, { ...campaign, status: newStatus });
                        }}
                        className={cn(
                            "px-4 h-11 rounded-xl border transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-3xl disabled:opacity-50",
                            campaign.status === 'Open' ? "bg-neon-green/10 border-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black" : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-50 hover:text-white"
                        )}
                        title={campaign.status === 'Open' ? "Close Campaign" : "Open Campaign"}
                    >
                        {campaign.status === 'Open' ? <Unlock size={14} /> : <Lock size={14} />}
                        <span>{campaign.status}</span>
                    </button>
                </div>
            </div>
        </div>
    </motion.div>
);


const CampaignListItem = ({ campaign, idx, onSelect, onEdit, onDelete, updateCampaign, onCopyLink, isUpdating }) => (
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
                CAMPAIGN
            </span>
        </div>

        <div className="w-40 hidden lg:block text-right pr-10">
            <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1">TASKS</p>
            <p className="text-lg font-black text-white font-mono">{campaign.tasks?.length || 0}</p>
        </div>

        <div className="hidden sm:flex w-48 items-center justify-end gap-3">
            <div className="flex gap-2">
                <button 
                    disabled={isUpdating}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isUpdating) return;
                        if (window.confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
                            onDelete(campaign.id);
                        }
                    }}
                    className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-50"
                    title="Delete Campaign"
                >
                    <Trash2 size={16} />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onCopyLink();
                    }}
                    className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-neon-blue hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all flex items-center justify-center"
                    title="Share Campaign"
                >
                    <Share2 size={16} />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(campaign);
                    }}
                    className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-neon-blue hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all flex items-center justify-center"
                    title="Edit Campaign"
                >
                    <Edit size={16} />
                </button>
                <button 
                    disabled={isUpdating}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isUpdating) return;
                        const newStatus = campaign.status === 'Open' ? 'Closed' : 'Open';
                        updateCampaign(campaign.id, { ...campaign, status: newStatus });
                    }}
                    className={cn(
                        "w-11 h-11 rounded-xl border transition-all flex items-center justify-center disabled:opacity-50",
                        campaign.status === 'Open' ? "bg-neon-green/10 border-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black" : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-50 hover:text-white"
                    )}
                    title={campaign.status === 'Open' ? "Close Campaign" : "Open Campaign"}
                >
                    {campaign.status === 'Open' ? <Unlock size={16} /> : <Lock size={16} />}
                </button>
            </div>
            <StatusPill status={campaign.status} />
        </div>

        <button 
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/5 border border-white/5 items-center justify-center group-hover:bg-white group-hover:text-black transition-all group-hover:scale-110"
            title="View Campaign Page"
        >
            <ChevronRight size={20} />
        </button>
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

const CampaignManager = () => {
    const { campaigns, addCampaign, updateCampaign, deleteCampaign, user, uploadToCloudinary } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [searchTerm, setSearchTerm] = useState('');
    const isCreating = location.pathname.endsWith('/create') || location.pathname.includes('/edit/');
    const editingId = location.pathname.includes('/edit/') ? params.id : null;
    const expandedCampaignId = location.pathname.includes('/manage/') ? params.id : null;
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingTaskAsset, setIsUploadingTaskAsset] = useState(false);
    const [modalTab, setModalTab] = useState('applicants'); 
    const [rejectionModal, setRejectionModal] = useState(null); 
    const [rejectionReason, setRejectionReason] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [isDeploying, setIsDeploying] = useState(false);
    const [isProcessingTask, setIsProcessingTask] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const personnelTabs = [
        { name: 'Creators', path: '/admin/creators', icon: Star },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
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

    useEffect(() => {
        if (editingId && campaigns.length > 0) {
            const campaign = campaigns.find(c => c.id === editingId);
            if (campaign) {
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
            }
        }
    }, [editingId, campaigns]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsDeploying(true);
        try {
            if (editingId) {
                await updateCampaign(editingId, formData);
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
        } finally {
            setIsDeploying(false);
        }
    };

    const handleEdit = (campaign) => {
        navigate(`/admin/campaigns/edit/${campaign.id}`);
    };

    const handleCopyLink = (id) => {
        const url = `${window.location.origin}/campaign/${id}`;
        navigator.clipboard.writeText(url);
        useStore.getState().addToast("Campaign link copied to clipboard!", 'success');
    };

    const handleCopyTaskLink = (campaignId, taskId) => {
        const url = `${window.location.origin}/campaign/${campaignId}?taskId=${taskId}`;
        navigator.clipboard.writeText(url);
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
                    '/creator-dashboard',
                    'campaign'
                );
            }
        } catch (error) {
            useStore.getState().addToast("Failed to toggle shortlist.", 'error');
        } finally {
            setIsUpdating(false);
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
                '/creator-dashboard',
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
                '/creator-dashboard',
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
        <div className="relative z-10 max-w-[1700px] mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 md:gap-10 mb-8 md:mb-12 pt-32 md:pt-48 px-4 md:px-12">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-neon-blue font-black tracking-[0.5em] text-[10px] uppercase">
                        <Layers size={14} />
                        Administrative Campaign Hub
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tighter uppercase italic leading-[0.8]">
                        CAMPAIGN <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500">OPERATIONS.</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-medium tracking-wide max-w-xl leading-relaxed">
                        Deploy and manage strategic creator campaigns. Monitor real-time task submissions, verify content, and orchestrate global followers.
                    </p>
                    <div className="pt-4 flex flex-wrap items-center gap-4">
                        <AdminDashboardLink />
                        <div className="flex items-center gap-1 bg-white/[0.02] p-1.5 rounded-2xl border border-white/5 backdrop-blur-3xl shadow-2xl">
                            {personnelTabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = tab.name === 'Campaigns';
                                return (
                                    <button
                                        key={tab.name}
                                        onClick={() => navigate(tab.path)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all",
                                            isActive ? "bg-neon-blue text-black shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Icon size={14} />
                                        {tab.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
                    <StatCard icon={<Zap size={24} />} label="ACTIVE CAMPAIGNS" value={stats.active} color="green" description={`${stats.total} Total Units`} />
                    <StatCard icon={<Clock size={24} />} label="PENDING REVIEW" value={stats.pending} color="yellow" description="Awaiting Verification" />
                </div>
            </div>

            <div className="px-4 md:px-12 pt-0">
                {/* Control Panel */}
                {!isCreating && !expandedCampaignId && (
                    <div className="relative z-50 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2.5 mb-8 md:mb-16 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col xl:flex-row xl:items-center gap-2 md:gap-3">
                        
                        {/* Search Engine */}
                        <div className="relative flex-1 min-w-[280px] group">
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full pointer-events-none" />
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-blue transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="SEARCH CAMPAIGNS..."
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
                            onClick={() => navigate('/admin/campaigns/create')}
                            className="group relative h-12 md:h-14 px-4 md:px-8 bg-white text-black rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] overflow-hidden hover:scale-[1.02] active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 w-full xl:w-auto shrink-0"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-500">
                                <Plus size={16} />
                                NEW CAMPAIGN
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
                                            {editingId ? 'EDIT' : 'NEW'} <span className="text-neon-blue">CAMPAIGN BRIEF</span>
                                        </h2>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={resetForm} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Discard</button>
                                        <button 
                                            onClick={handleSubmit} 
                                            disabled={isDeploying || isUploading}
                                            className="h-12 px-10 bg-white text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all flex items-center justify-center gap-3 min-w-[140px]"
                                        >
                                            {isDeploying ? <LoadingSpinner size="xs" color="black" /> : 'DEPLOΥ'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-7 space-y-8">
                                        <Card className="p-8 md:p-10 bg-[#0A0A0A]/60 backdrop-blur-3xl border-white/5 rounded-[2.5rem] shadow-2xl space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">TITLE</label>
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
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">CAMPAIGN IMAGE (OR CTRL+V)</label>
                                                <div className="flex gap-4 items-center">
                                                    {formData.thumbnail && (
                                                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                                                            <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 flex gap-4">
                                                        <Input 
                                                            value={formData.thumbnail} 
                                                            onChange={e => setFormData({ ...formData, thumbnail: e.target.value })} 
                                                            onPaste={handlePaste}
                                                            placeholder="ASSET URL OR PASTE IMAGE" 
                                                            className="flex-1 h-14 bg-black/50 border-white/10 rounded-2xl" 
                                                        />
                                                        <label className="w-20 h-14 bg-black/30 border-2 border-dashed border-white/10 hover:border-neon-blue/30 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center group shrink-0">
                                                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                                            <ImageIcon size={18} className="text-gray-500 group-hover:text-neon-blue transition-colors" />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <StudioRichEditor 
                                                label="DESCRIPTION"
                                                required
                                                value={formData.description}
                                                onChange={val => setFormData({ ...formData, description: val })}
                                                placeholder="Describe the campaign requirements and goals..."
                                                minHeight="180px"
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">REWARDS</label>
                                                    <Input required value={formData.reward} onChange={e => setFormData({ ...formData, reward: e.target.value })} placeholder="e.g. ₹5,000 + Products" className="h-14 bg-black/50 border-white/10 rounded-2xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">MINIMUM FOLLOWERS</label>
                                                    <Input type="number" required value={formData.minInstagramFollowers} onChange={e => setFormData({ ...formData, minInstagramFollowers: parseInt(e.target.value) })} placeholder="e.g. 5000" className="h-14 bg-black/50 border-white/10 rounded-2xl" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">WHATSAPP GROUP LINK</label>
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
                                                        <h4 className="text-white text-sm font-black uppercase tracking-widest italic leading-tight">PIN TO TOP</h4>
                                                        <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-[0.1em]">SHOW AT THE TOP OF THE LIST</p>
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

                                    <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-32 h-fit">
                                        <LivePreview type="campaign" data={formData} />
                                        <Card className="p-8 md:p-10 bg-[#0A0A0A]/60 backdrop-blur-3xl border-white/5 rounded-[2.5rem] shadow-2xl">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                                    <Zap size={18} className="text-neon-blue" /> TASKS
                                                </h3>
                                                <button type="button" onClick={() => setFormData({ ...formData, tasks: [...formData.tasks, { id: Date.now().toString(), title: '', description: '', taskType: 'custom', platform: 'instagram', priority: 'required', creativeAssets: [], creativeLinks: [], submissions: {} }] })} className="h-10 px-5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                                    + Add Task
                                                </button>
                                            </div>

                                            <div className="space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                                                {formData.tasks.map((task, index) => (
                                                    <TaskEditorCard 
                                                        key={task.id}
                                                        task={task}
                                                        index={index}
                                                        totalTasks={formData.tasks.length}
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
                                    onReviewSubmission={handleReviewSubmission}
                                    onDelete={handleDeleteCampaign}
                                    updateCampaign={handleUpdateCampaignStatus}
                                    onCopyLink={() => handleCopyLink(expandedCampaignId)}
                                    onCopyTaskLink={(taskId) => handleCopyTaskLink(expandedCampaignId, taskId)}
                                />
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
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-500 italic">No Campaigns Found</h3>
                                    <p className="text-gray-700 text-sm font-black uppercase tracking-widest">Deploy a campaign to begin operations</p>
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
                                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 items-start pb-8 md:pb-0"
                                        >
                                            {paginatedCampaigns.map((campaign, idx) => (
                                                <motion.div
                                                    key={campaign.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="w-full"
                                                >
                                                    <CampaignBadgeCard 
                                                        campaign={campaign} 
                                                        onSelect={() => navigate('/admin/campaigns/manage/' + campaign.id)}
                                                        onEdit={() => handleEdit(campaign)}
                                                        onDelete={handleDeleteCampaign}
                                                        updateCampaign={handleUpdateCampaignStatus}
                                                        onCopyLink={() => handleCopyLink(campaign.id)}
                                                        isUpdating={isUpdating}
                                                    />

                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-6 px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] border-b border-white/5">
                                            <div className="w-16 shrink-0">Asset</div>
                                            <div className="flex-1 pl-1">Campaign Brief</div>
                                            <div className="w-48 hidden md:block">Status</div>
                                            <div className="w-40 hidden lg:block text-right pr-10">Tasks</div>
                                            <div className="w-12 shrink-0"></div>
                                        </div>
                                        {paginatedCampaigns.map((campaign, idx) => (
                                            <CampaignListItem 
                                                key={campaign.id}
                                                campaign={campaign}
                                                idx={idx}
                                                onSelect={() => navigate('/admin/campaigns/manage/' + campaign.id)}
                                                onEdit={() => handleEdit(campaign)}
                                                onDelete={handleDeleteCampaign}
                                                updateCampaign={handleUpdateCampaignStatus}
                                                onCopyLink={() => handleCopyLink(campaign.id)}
                                                isUpdating={isUpdating}
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
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(46,191,255,0.08),transparent_50%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_30%,transparent_100%)]" />
                <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            {renderContent()}
            
            <AnimatePresence>
                {rejectionModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-6">REJECTION FEEDBACK</h3>
                            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Provide specific reasons for rejection..." className="w-full h-40 bg-black border border-white/10 rounded-2xl p-6 text-sm text-white focus:border-red-500/50 outline-none transition-all resize-none mb-6" />
                            <div className="flex gap-4">
                                <button onClick={() => setRejectionModal(null)} className="flex-1 h-14 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                                <button 
                                    onClick={confirmRejection} 
                                    disabled={isReviewing}
                                    className="flex-1 h-14 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                                >
                                    {isReviewing ? <LoadingSpinner size="xs" color="white" /> : 'Confirm Rejection'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}/* --- Detailed Mission Modal --- */

const CampaignDetailView = ({ campaignId, onClose, onEdit, onToggleShortlist, onReviewSubmission, onDelete, updateCampaign, onCopyLink, onCopyTaskLink }) => {
    const { campaigns, creators } = useStore();
    const campaign = campaigns.find(c => c.id === campaignId);
    const [activeTab, setActiveTab] = useState('applicants'); // applicants | tasks

    if (!campaign) return null;

    const appliedCreators = creators.filter(c => (c.joinedCampaigns || []).includes(campaign.id));
    const approvedCreators = appliedCreators.filter(c => (c.shortlistedCampaigns || []).includes(campaign.id));

    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full space-y-8 pb-20 pt-4"
        >
            {/* Back Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                <button 
                    onClick={onClose} 
                    className="group flex items-center gap-3 px-6 py-3.5 rounded-full bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black shadow-lg backdrop-blur-xl w-fit"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    BACK TO CAMPAIGNS
                </button>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => {
                            const newStatus = campaign.status === 'Open' ? 'Closed' : 'Open';
                            updateCampaign(campaign.id, { ...campaign, status: newStatus });
                        }}
                        className={cn(
                            "h-12 px-6 border rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl backdrop-blur-xl",
                            campaign.status === 'Open' ? "bg-neon-green/10 border-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black" : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                        )}
                    >
                        {campaign.status === 'Open' ? <Unlock size={14} /> : <Lock size={14} />}
                        {campaign.status === 'Open' ? 'ACTIVE (CLICK TO CLOSE)' : 'CLOSED (CLICK TO OPEN)'}
                    </button>
                    <button 
                        onClick={onCopyLink} 
                        className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all shadow-xl backdrop-blur-xl"
                        title="Share Campaign"
                    >
                        <Share2 size={18} />
                    </button>
                    <button 
                        onClick={() => onEdit(campaign)} 
                        className="h-12 px-6 bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest rounded-full hover:bg-white hover:text-black transition-all text-xs flex items-center gap-2 shadow-xl backdrop-blur-xl"
                    >
                        <Edit size={14} /> EDIT BRIEF
                    </button>
                    <button 
                        onClick={() => onDelete(campaign.id)} 
                        className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl backdrop-blur-xl"
                        title="Delete Campaign"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Campaign Hero Card */}
            <div className="relative bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-neon-blue/10 via-neon-pink/10 to-purple-500/10 blur-[120px] pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 w-full lg:w-auto">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] bg-black border border-white/10 overflow-hidden shrink-0 shadow-2xl group relative flex items-center justify-center font-black text-white/20 text-xs tracking-widest">
                            {campaign.thumbnail ? (
                                <img src={campaign.thumbnail} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <span>NO IMAGE</span>
                            )}
                            <div className="absolute top-3 right-3">
                                <StatusPill status={campaign.status} />
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 min-w-0">
                            <div>
                                <div className="flex items-center gap-3 text-neon-blue font-black tracking-[0.4em] text-[10px] uppercase mb-2">
                                    <Target size={14} /> CAMPAIGN BRIEF
                                </div>
                                <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight">
                                    {campaign.title}
                                </h1>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-widest">
                                <span className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-gray-300 shadow-inner">
                                    <MapPin size={14} className="text-neon-pink" /> {campaign.targetCity || 'GLOBAL'}
                                </span>
                                <span className="flex items-center gap-2 bg-neon-green/10 border border-neon-green/20 px-4 py-2 rounded-xl text-neon-green shadow-inner">
                                    <IndianRupee size={14} /> {campaign.reward}
                                </span>
                                <span className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-xl text-purple-400 shadow-inner">
                                    <Users size={14} /> {campaign.minInstagramFollowers ? `${campaign.minInstagramFollowers}+ FOLLOWERS REQ.` : 'ANY FOLLOWERS'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {campaign.whatsappLink && (
                        <a 
                            href={campaign.whatsappLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="group flex items-center gap-4 bg-green-500/10 border border-green-500/20 hover:bg-green-500 hover:text-black text-green-500 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl backdrop-blur-xl shrink-0 w-full lg:w-auto justify-center"
                        >
                            <ExternalLink size={18} className="group-hover:rotate-45 transition-transform" />
                            JOIN WHATSAPP GROUP
                        </a>
                    )}
                </div>

                {campaign.description && (
                    <div className="mt-8 pt-8 border-t border-white/5 text-gray-400 text-sm leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: campaign.description }} />
                )}
            </div>

            {/* Tabs & Content */}
            <div className="space-y-8">
                <div className="flex gap-4 border-b border-white/5 pb-4">
                    {['applicants', 'tasks'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "relative px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all",
                                activeTab === tab ? "bg-white text-black shadow-xl" : "bg-white/5 text-gray-500 hover:text-white border border-white/5"
                            )}
                        >
                            {tab === 'applicants' ? `APPLICATIONS (${appliedCreators.length})` : `CAMPAIGN TASKS (${campaign.tasks?.length || 0})`}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'applicants' ? (
                            <div className="space-y-6">
                                {appliedCreators.length === 0 ? (
                                    <div className="py-24 text-center bg-[#0A0A0A]/40 border border-white/5 rounded-[2.5rem] flex flex-col items-center gap-6 opacity-60">
                                        <Users size={48} className="text-gray-600" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-black uppercase tracking-tighter text-white">No Applications Received Yet</p>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Creators who apply will appear here for shortlisting</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                                        {appliedCreators.map(creator => {
                                            const isShortlisted = (creator.shortlistedCampaigns || []).includes(campaign.id);
                                            return (
                                                <div key={creator.uid} className={cn("p-8 rounded-[2.5rem] border transition-all duration-500 group relative overflow-hidden backdrop-blur-xl", isShortlisted ? "bg-neon-blue/10 border-neon-blue/30 shadow-[0_10px_30px_rgba(46,191,255,0.1)]" : "bg-[#0A0A0A]/60 border-white/5 hover:border-white/20")}>
                                                    <div className="flex items-start justify-between mb-8">
                                                        <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-xl font-black italic text-white shadow-inner">{creator.name.charAt(0)}</div>
                                                        <button 
                                                            onClick={() => onToggleShortlist(creator.uid, campaign.id)}
                                                            className={cn(
                                                                "px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all shadow-lg",
                                                                isShortlisted ? "bg-neon-blue text-black border-neon-blue font-black" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white hover:text-black hover:border-white"
                                                            )}
                                                        >
                                                            {isShortlisted ? '✓ SHORTLISTED' : '+ SHORTLIST'}
                                                        </button>
                                                    </div>
                                                    <h4 className="text-xl font-black text-white uppercase italic tracking-tight mb-3 group-hover:text-neon-blue transition-colors">{creator.name}</h4>
                                                    <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/5 border border-white/5 px-4 py-2 rounded-xl w-fit">
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
                                {(campaign.tasks || []).length === 0 ? (
                                    <div className="py-24 text-center bg-[#0A0A0A]/40 border border-white/5 rounded-[2.5rem] flex flex-col items-center gap-6 opacity-60">
                                        <Target size={48} className="text-gray-600" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-black uppercase tracking-tighter text-white">No Tasks Configured</p>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Edit the campaign brief to add tasks for creators</p>
                                        </div>
                                    </div>
                                ) : (campaign.tasks || []).map((task, idx) => (
                                    <div key={task.id} className="space-y-6 bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center font-black text-neon-blue text-lg shadow-inner">{idx + 1}</div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1">{task.title}</h4>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">{task.platform} TASK</p>
                                                        {task.deadline && (
                                                            <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">
                                                                DEADLINE: {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onCopyTaskLink(task.id)}
                                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest w-fit"
                                                title="Share Task Link"
                                            >
                                                <Share2 size={14} /> SHARE TASK
                                            </button>
                                        </div>

                                        {task.description && (
                                            <div className="text-gray-400 text-xs leading-relaxed prose prose-invert max-w-none bg-black/40 p-6 rounded-2xl border border-white/5" dangerouslySetInnerHTML={{ __html: task.description }} />
                                        )}

                                        {/* Task Verification Dashboard */}
                                        <div className="space-y-4 pt-4">
                                            <div className="flex items-center justify-between px-2">
                                                <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-2">
                                                    <CheckCircle2 size={14} className="text-neon-blue" /> TASK VERIFICATION & SUBMISSIONS
                                                </h5>
                                                <div className="px-4 py-1.5 bg-neon-blue/10 rounded-full text-[9px] font-black text-neon-blue uppercase tracking-widest border border-neon-blue/20">
                                                    Awaiting {Object.values(task.submissions || {}).filter(s => s.status === 'submitted').length} Reviews
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {approvedCreators.length === 0 ? (
                                                    <div className="p-8 text-center bg-black/40 rounded-[2rem] border border-white/5 text-gray-600 text-[10px] font-black uppercase tracking-widest italic">
                                                        No shortlisted creators assigned to this campaign yet.
                                                    </div>
                                                ) : approvedCreators.map(creator => {
                                                    const sub = task.submissions?.[creator.uid];
                                                    const status = sub?.status || 'not_started';
                                                    
                                                    return (
                                                        <div key={creator.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-black/60 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-all gap-4 shadow-lg backdrop-blur-xl">
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black italic text-white shadow-inner">{creator.name.charAt(0)}</div>
                                                                <div>
                                                                    <p className="text-base font-black text-white uppercase italic tracking-tight mb-1">{creator.name}</p>
                                                                    <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border", 
                                                                        status === 'approved' ? "bg-neon-green/10 text-neon-green border-neon-green/30" : 
                                                                        status === 'submitted' ? "bg-neon-blue/10 text-neon-blue border-neon-blue/30 animate-pulse" : 
                                                                        status === 'rejected' ? "bg-red-500/10 text-red-500 border-red-500/30" : "bg-white/5 text-gray-500 border-white/10"
                                                                    )}>
                                                                        {status.replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-3">
                                                                {sub?.submissionUrl && (
                                                                    <a href={sub.submissionUrl} target="_blank" rel="noreferrer" className="h-11 px-6 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-black transition-all shadow-md">
                                                                        <ExternalLink size={14} /> VIEW SUBMISSION
                                                                    </a>
                                                                )}
                                                                {status === 'submitted' && (
                                                                    <div className="flex gap-2">
                                                                        <button 
                                                                            onClick={() => onReviewSubmission(campaign.id, task.id, creator.uid, 'approved')} 
                                                                            disabled={isReviewing}
                                                                            className="h-11 px-6 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/30 flex items-center gap-2 hover:bg-neon-green hover:text-black transition-all text-[9px] font-black uppercase tracking-widest shadow-md"
                                                                            title="Approve Submission"
                                                                        >
                                                                            {isReviewing ? <LoadingSpinner size="xs" color="neon-green" /> : <Check size={16} />} APPROVE
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => onReviewSubmission(campaign.id, task.id, creator.uid, 'rejected')} 
                                                                            disabled={isReviewing}
                                                                            className="h-11 px-6 rounded-xl bg-red-500/20 text-red-500 border border-red-500/30 flex items-center gap-2 hover:bg-red-50 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest shadow-md"
                                                                            title="Reject Submission"
                                                                        >
                                                                            {isReviewing ? <LoadingSpinner size="xs" color="red" /> : <X size={16} />} REJECT
                                                                        </button>
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
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );

    return (
        <>
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(46,191,255,0.08),transparent_50%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_30%,transparent_100%)]" />
                <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            {renderContent()}
        </>
    );
};

/* --- Task Editor Sub-component --- */

const TaskEditorCard = React.memo(({ task, index, totalTasks, onUpdate, onRemove, onMoveUp, onMoveDown, onUploadCreative, isUploading }) => {
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
                        <button type="button" onClick={e => { e.stopPropagation(); onMoveUp(index); }} disabled={index === 0} className="text-gray-700 hover:text-white disabled:opacity-20 transition-colors"><ArrowUp size={12} /></button>
                        <button type="button" onClick={e => { e.stopPropagation(); onMoveDown(index); }} disabled={index === totalTasks - 1} className="text-gray-700 hover:text-white disabled:opacity-20 transition-colors"><ArrowDown size={12} /></button>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center">
                        <TaskTypeIcon size={20} className="text-neon-blue" />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <p className="text-[13px] font-black text-white uppercase tracking-tight truncate">{task.title || `Task ${index + 1}`}</p>
                        {task.priority === 'required' && <span className="px-3 py-1 bg-neon-blue/10 border border-neon-blue/20 rounded-full text-[7px] font-black uppercase tracking-widest text-neon-blue">MANDATORY</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                        <PlatformIcon size={12} className="text-gray-600" />
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{task.platform}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => onRemove(index)} className="w-11 h-11 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"><Trash2 size={16} /></button>
                    <ChevronDown size={20} className={cn("text-gray-600 transition-transform duration-500", isExpanded && "rotate-180")} />
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-6 pb-8 space-y-6 border-t border-white/5 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Task Title</label>
                                    <Input required value={task.title} onChange={e => onUpdate(index, 'title', e.target.value)} placeholder="e.g. Instagram Reel" className="h-12 bg-black/40 border-white/10 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Platform</label>
                                    <StudioSelect value={task.platform || 'instagram'} options={PLATFORMS.map(p => ({ value: p.value, label: p.label.toUpperCase() }))} onChange={val => onUpdate(index, 'platform', val)} className="h-12" accentColor="neon-blue" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Task Deadline</label>
                                    <StudioDatePicker 
                                        value={task.deadline} 
                                        onChange={val => onUpdate(index, 'deadline', val)} 
                                        className="h-12 bg-black/40 border-white/10 rounded-xl"
                                        placeholder="Set deadline"
                                    />
                                </div>
                            </div>

                            <StudioRichEditor label="Task Description" value={task.description} onChange={val => onUpdate(index, 'description', val)} placeholder="Describe what the creator should do..." minHeight="120px" />

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
});

export default CampaignManager;
