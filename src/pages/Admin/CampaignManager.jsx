import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import FilterSearchBar from '../../design-system/controls/FilterSearchBar';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Gift from 'lucide-react/dist/esm/icons/gift';
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
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

import { cn, getCampaignSpotsInfo } from '../../lib/utils';
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

const StatCard = ({ icon, label, value, color, description, compact = false }) => {
    const colorMap = {
        blue: { text: 'text-neon-blue' },
        green: { text: 'text-neon-green' },
        yellow: { text: 'text-yellow-500' },
        purple: { text: 'text-purple-500' }
    };
    
    const theme = colorMap[color] || colorMap.blue;
    
    return (
        <motion.div 
            whileHover={{ y: -2 }}
            className={cn(
                "relative group overflow-hidden bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] transition-all duration-300 flex-1 shadow-sm dark:shadow-none",
                compact ? "p-4 md:p-5 rounded-2xl min-w-[200px]" : "p-6 md:p-8 rounded-3xl min-w-[280px]"
            )}
        >
            <div className={cn("relative z-10 flex h-full", compact ? "flex-row items-center gap-4" : "flex-col justify-between gap-6")}>
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shrink-0", 
                        compact ? "w-10 h-10 md:w-12 md:h-12" : "w-14 h-14",
                        theme.text
                    )}>
                        {React.cloneElement(icon, { size: compact ? 18 : 24 })}
                    </div>
                    {!compact && (
                        <div className="text-right">
                            <TrendingUp size={16} className={cn("inline-block mr-2", theme.text)} />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">+15%</span>
                        </div>
                    )}
                </div>
                <div className={cn("space-y-1", compact ? "flex-1" : "")}>
                    <p className={cn("font-black uppercase tracking-widest text-gray-500", compact ? "text-[9px]" : "text-[10px]")}>{label}</p>
                    <h3 className={cn("font-black font-heading tracking-tight tabular-nums text-gray-900 dark:text-white leading-none", compact ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl")}>{value}</h3>
                    {!compact && description && (
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">{description}</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const CampaignBadgeCard = ({ campaign, onSelect, onEdit, onDelete, updateCampaign, onCopyLink, isUpdating, creators = [] }) => {
    const spotsInfo = getCampaignSpotsInfo(campaign, creators);
    return (
    <motion.div 
        layoutId={`campaign-card-${campaign.id}`}
        onClick={onSelect}
        className="group relative bg-white/70 dark:bg-[#0c0e14]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/[0.15] rounded-3xl p-4 md:p-6 cursor-pointer overflow-hidden transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_60px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_60px_rgba(0,0,0,0.6)] flex flex-col h-auto min-h-[510px]"
    >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-neon-green/[0.06] to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" />
        <div className="relative mb-5 group-hover:scale-[1.02] transition-transform duration-500 z-10">
            <div className="aspect-video rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.08] relative flex items-center justify-center">
                {campaign.thumbnail ? (
                    <img src={campaign.thumbnail} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-white/5">
                        <div className="text-xl font-heading font-black text-gray-300 dark:text-white/10 uppercase tracking-wider">
                            No Image
                        </div>
                    </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {spotsInfo.hasSpots && (
                        <span className={cn(
                            "px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border backdrop-blur-md flex items-center gap-1 font-mono shadow-md",
                            spotsInfo.isFull 
                                ? "bg-red-500/20 text-red-500 border-red-500/30" 
                                : "bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/30"
                        )}>
                            <Flame size={9} className="fill-current" />
                            {spotsInfo.isFull ? '0 Left' : `${spotsInfo.spotsLeft} Left`}
                        </span>
                    )}
                    <StatusPill status={campaign.status} />
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col px-1 relative z-10">
            <div className="mb-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Campaign</p>
                    {(campaign.brand || campaign.brandLogo) && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 max-w-[180px]">
                            {campaign.brandLogo && (
                                <img src={campaign.brandLogo} alt={campaign.brand || 'Brand'} className="w-3.5 h-3.5 rounded object-contain shrink-0" />
                            )}
                            {campaign.brand && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-neon-green truncate">
                                    {campaign.brand}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-neon-green transition-colors duration-300 line-clamp-2">
                    {campaign.title}
                </h3>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full border border-black/[0.08] dark:border-white/[0.08] w-fit">
                    <MapPin size={12} className="text-neon-pink" />
                    <span>{campaign.targetCity || 'GLOBAL'}</span>
                </div>
                {campaign.targetCollege && campaign.targetCollege !== 'Any' && (
                    <div className="flex items-center gap-2 text-neon-blue text-[10px] font-black uppercase tracking-widest bg-neon-blue/10 px-3 py-1.5 rounded-full border border-neon-blue/20 w-fit">
                        <Layers size={12} />
                        <span>{campaign.targetCollege}</span>
                    </div>
                )}
                {spotsInfo.hasSpots && (
                    <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border w-fit",
                        spotsInfo.isFull 
                            ? "text-red-500 bg-red-500/10 border-red-500/20" 
                            : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                    )}>
                        <Users size={12} />
                        <span>{spotsInfo.isFull ? '0 SPOTS LEFT (FULL)' : `${spotsInfo.spotsLeft} / ${spotsInfo.totalSpots || '∞'} SPOTS LEFT`}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 w-fit">
                    <Zap size={12} />
                    <span>{campaign.tasks?.length || 0} TASKS</span>
                </div>
            </div>

            <div className="mt-auto pt-5 border-t border-black/[0.08] dark:border-white/[0.08] flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">REWARDS</p>
                        <p className="text-lg font-heading font-black text-neon-green tracking-tight truncate">{campaign.reward}</p>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                        className="h-10 px-4 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:bg-emerald-400 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                        title="View Campaign Page"
                    >
                        <span>Manage</span>
                        <ChevronRight size={14} />
                    </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-black/[0.08] dark:border-white/[0.08] -mx-2 px-2">
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={isUpdating}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isUpdating) return;
                                if (window.confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
                                    onDelete(campaign.id);
                                }
                            }}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-all flex items-center justify-center disabled:opacity-50"
                            title="Delete Campaign"
                        >
                            <Trash2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onCopyLink();
                            }}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-800 dark:text-zinc-200 hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-center"
                            title="Share Campaign"
                        >
                            <Share2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(campaign);
                            }}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-800 dark:text-zinc-200 hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-center"
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
                            "h-10 px-3 rounded-xl border transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-50",
                            campaign.status === 'Open' ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-700 dark:text-neon-green" : "bg-red-500/15 border-red-500/20 text-red-600 dark:text-red-400"
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
};


const CampaignListItem = ({ campaign, idx, onSelect, onEdit, onDelete, updateCampaign, onCopyLink, isUpdating, creators = [] }) => {
    const spotsInfo = getCampaignSpotsInfo(campaign, creators);
    return (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.03 }}
        onClick={onSelect}
        className="group flex flex-col sm:flex-row items-start sm:items-center p-4 sm:px-6 sm:py-4 bg-white/70 dark:bg-[#0c0e14]/80 backdrop-blur-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-black/20 dark:hover:border-white/[0.15] hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] rounded-[1.5rem] cursor-pointer transition-all duration-300 gap-4 sm:gap-6 relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-neon-green/[0.05] to-transparent rounded-full blur-2xl pointer-events-none -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700 z-0" />
        <div className="w-14 relative z-10">
            <div className="w-12 h-12 bg-gray-50 dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.08] rounded-xl flex items-center justify-center text-gray-400 group-hover:border-black/20 dark:group-hover:border-white/20 overflow-hidden transition-all group-hover:scale-105">
                {campaign.thumbnail ? (
                    <img src={campaign.thumbnail} alt={campaign.title} className="w-full h-full object-cover" />
                ) : (
                    <Target size={18} />
                )}
            </div>
        </div>
        
        <div className="flex-1 w-full sm:w-auto">
            <div className="flex items-center gap-2 mb-1">
                {(campaign.brand || campaign.brandLogo) && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shrink-0 max-w-[140px]">
                        {campaign.brandLogo && (
                            <img src={campaign.brandLogo} alt="" className="w-3.5 h-3.5 rounded object-contain shrink-0" />
                        )}
                        {campaign.brand && (
                            <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-neon-green truncate">
                                {campaign.brand}
                            </span>
                        )}
                    </div>
                )}
                <h4 className="text-base font-heading font-black text-gray-900 dark:text-white tracking-tight group-hover:text-neon-green transition-colors truncate">{campaign.title}</h4>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-[9px] text-gray-500 font-black tracking-widest flex items-center gap-1.5 uppercase">
                    <MapPin size={10} className="text-neon-pink" /> {campaign.targetCity}
                </p>
                {campaign.targetCollege && campaign.targetCollege !== 'Any' && (
                    <>
                        <div className="w-1 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                        <p className="text-[9px] text-neon-blue font-black tracking-widest flex items-center gap-1.5 uppercase">
                            <Layers size={10} /> {campaign.targetCollege}
                        </p>
                    </>
                )}
                <div className="w-1 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{campaign.reward}</p>
            </div>
        </div>

        <div className="w-44 hidden md:block">
            {spotsInfo.hasSpots ? (
                <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5",
                    spotsInfo.isFull 
                        ? "text-red-500 bg-red-500/10 border-red-500/20" 
                        : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                )}>
                    <Users size={10} />
                    {spotsInfo.isFull ? '0 Spots Left (Full)' : `${spotsInfo.spotsLeft} Spots Left`}
                </span>
            ) : (
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 bg-black/5 dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 rounded-full group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                    Campaign
                </span>
            )}
        </div>

        <div className="w-32 hidden lg:block text-right pr-8">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Tasks</p>
            <p className="text-base font-heading font-black text-gray-900 dark:text-white tabular-nums">{campaign.tasks?.length || 0}</p>
        </div>

        <div className="hidden sm:flex w-48 items-center justify-end gap-3">
            <div className="flex gap-1.5">
                <button 
                    disabled={isUpdating}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isUpdating) return;
                        if (window.confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
                            onDelete(campaign.id);
                        }
                    }}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all flex items-center justify-center disabled:opacity-50"
                    title="Delete Campaign"
                >
                    <Trash2 size={14} />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onCopyLink();
                    }}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-center"
                    title="Share Campaign"
                >
                    <Share2 size={14} />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(campaign);
                    }}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-center"
                    title="Edit Campaign"
                >
                    <Edit size={14} />
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
                        "w-9 h-9 rounded-xl border transition-all flex items-center justify-center disabled:opacity-50",
                        campaign.status === 'Open' ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-700 dark:text-neon-green" : "bg-red-500/15 border-red-500/20 text-red-600 dark:text-red-400"
                    )}
                    title={campaign.status === 'Open' ? "Close Campaign" : "Open Campaign"}
                >
                    {campaign.status === 'Open' ? <Unlock size={14} /> : <Lock size={14} />}
                </button>
            </div>
            <StatusPill status={campaign.status} />
        </div>

        <button 
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            className="hidden sm:flex w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group-hover:scale-105"
            title="View Campaign Page"
        >
            <ChevronRight size={16} />
        </button>
    </motion.div>
    );
};

const StatusPill = ({ status }) => {
    const config = {
        Open: "bg-emerald-500/15 text-emerald-700 dark:text-neon-green border-emerald-500/20 dark:border-neon-green/20",
        Closed: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
        Archive: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20"
    };
    const style = config[status] || config.Open;
    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border", style)}>
            {status || 'OPEN'}
        </span>
    );
};

const getPageNumbers = (currentPage, totalPages) => {
    const pages = [];
    const delta = 2;
    
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        const left = currentPage - delta;
        const right = currentPage + delta;
        const range = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                range.push(i);
            }
        }

        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    pages.push(l + 1);
                } else if (i - l > 2) {
                    pages.push('...');
                }
            }
            pages.push(i);
            l = i;
        }
    }
    return pages;
};

/* --- Main Campaign Manager Component --- */

const CampaignManager = ({ isEmbedded = false }) => {
    useStoreSubscription(['campaigns', 'creators']);
    const { campaigns, creators, addCampaign, updateCampaign, deleteCampaign, user, uploadToCloudinary } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [searchTerm, setSearchTerm] = useState('');
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
    const [viewMode, setViewMode] = useState('grid');
    const [isDeploying, setIsDeploying] = useState(false);
    const [isProcessingTask, setIsProcessingTask] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const personnelTabs = [
        { name: 'Creators', path: '/admin/creators', icon: Star },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
        { name: 'Leaderboard', path: '/admin/creators/leaderboard', icon: Trophy },
        { name: 'Settings', path: '/admin/creators/settings', icon: Settings },
    ];

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
        thumbnail: '',
        tasks: [],
        isPinned: false
    });



    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c =>
            (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                    '/creator-dashboard',
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
        <div className={cn("relative z-10 max-w-[1700px] mx-auto pb-20", (isCreating || expandedCampaignId) ? "pt-24 md:pt-32 px-4 md:px-12" : "")}>
            <div className={cn("pt-0", !(isCreating || expandedCampaignId) ? (isEmbedded ? "" : "px-4 md:px-12") : "")}>
                {/* Control Panel */}
                {!isCreating && !expandedCampaignId && (
                    <div className="relative z-50 bg-white/70 dark:bg-[#0c0e14]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-3 md:p-4 mb-8 md:mb-12 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col xl:flex-row xl:items-center gap-4">
                        
                        <div className="relative flex-1 min-w-[280px]">
                            <FilterSearchBar 
                                searchQuery={searchTerm}
                                onSearchChange={setSearchTerm}
                                placeholder="SEARCH CAMPAIGNS..."
                                className="w-full"
                            />
                        </div>

                        {/* View Switcher */}
                        <div className="hidden md:flex items-center gap-1.5 shrink-0 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-black/5 dark:border-white/5">
                            <button 
                                onClick={() => setViewMode('grid')} 
                                className={cn(
                                    "px-4 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all", 
                                    viewMode === 'grid' 
                                        ? "bg-white text-black dark:bg-[#1a1c23] dark:text-white shadow-sm font-black border border-black/10 dark:border-white/10" 
                                        : "text-gray-600 dark:text-zinc-400 font-bold hover:text-black dark:hover:text-white"
                                )}
                            >
                                <LayoutGrid size={14} />
                                <span>Grid</span>
                            </button>
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={cn(
                                    "px-4 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all", 
                                    viewMode === 'list' 
                                        ? "bg-white text-black dark:bg-[#1a1c23] dark:text-white shadow-sm font-black border border-black/10 dark:border-white/10" 
                                        : "text-gray-600 dark:text-zinc-400 font-bold hover:text-black dark:hover:text-white"
                                )}
                            >
                                <FileSpreadsheet size={14} />
                                <span>List</span>
                            </button>
                        </div>

                        <button 
                            onClick={() => navigate('/admin/campaigns/create')}
                            className="h-12 px-8 rounded-2xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.25)] flex items-center justify-center gap-2 w-full xl:w-auto shrink-0"
                        >
                            <Plus size={16} />
                            NEW CAMPAIGN
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
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-500">
                                            <button onClick={resetForm} className="hover:text-neon-green transition-colors">CAMPAIGNS</button>
                                            <span className="text-gray-300 dark:text-gray-700">/</span>
                                            <span className="text-gray-900 dark:text-white">{editingId ? 'EDIT' : 'CREATE'}</span>
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-heading font-black tracking-tight text-gray-900 dark:text-white">
                                            {editingId ? 'Edit Campaign' : 'New Campaign'}
                                        </h2>
                                    </div>
                                    <div className="fixed md:relative bottom-0 left-0 right-0 z-50 flex items-center justify-center md:justify-end gap-4 bg-white/95 dark:bg-[#0c0e14]/95 md:bg-transparent backdrop-blur-2xl md:backdrop-blur-none border-t border-black/[0.08] dark:border-white/[0.08] md:border-none p-4 md:p-0 shadow-sm md:shadow-none">
                                        <button onClick={resetForm} className="px-4 py-2 text-[11px] font-black text-gray-500 hover:text-gray-900 dark:hover:text-white uppercase tracking-widest transition-colors">Discard</button>
                                        <button 
                                            onClick={handleSubmit} 
                                            disabled={isDeploying || isUploading}
                                            className="h-14 px-8 rounded-2xl bg-neon-green text-black font-black uppercase tracking-widest text-sm hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.3)] flex items-center justify-center gap-3 min-w-[160px] flex-1 md:flex-none"
                                        >
                                            {isDeploying ? <LoadingSpinner size="sm" color="black" /> : (editingId ? 'SAVE CHANGES' : 'CREATE CAMPAIGN')}
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
                                className="py-40 text-center bg-[#050505]/40 rounded-[4rem] border border-black/10 dark:border-white/5 flex flex-col items-center gap-8 shadow-inner"
                            >
                                <div className="w-32 h-32 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 animate-pulse">
                                    <Target size={48} className="text-gray-700" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-500 italic">No Campaigns Found</h3>
                                    <p className="text-gray-700 text-sm font-black uppercase tracking-widest">Create a campaign to begin operations</p>
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
                                    <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8 overflow-x-auto hide-scrollbar pb-8 px-2">
                                        {['Open', 'Closed'].map(status => (
                                            <div key={status} className="relative group/column w-full md:w-[420px] shrink-0 bg-white/70 dark:bg-[#0c0e14]/80 backdrop-blur-3xl rounded-[2rem] p-5 md:p-6 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden">
                                                {/* Ambient Column Glow */}
                                                <div className={cn(
                                                    "absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 transition-opacity duration-700 opacity-20 dark:opacity-10 group-hover/column:opacity-40 dark:group-hover/column:opacity-20",
                                                    status === 'Open' ? "bg-neon-green" : "bg-red-500"
                                                )} />
                                                
                                                <div className="relative z-10 flex items-center justify-between mb-8 px-1">
                                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white flex items-center gap-3">
                                                        <div className={cn("w-2 h-2 rounded-full", status === 'Open' ? "bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]")} />
                                                        {status} CAMPAIGNS
                                                    </h3>
                                                    <span className="text-xs font-bold bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-xl text-gray-600 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.05]">
                                                        {paginatedCampaigns.filter(c => c.status === status).length}
                                                    </span>
                                                </div>
                                                <div className="relative z-10 flex flex-col gap-5">
                                                    {paginatedCampaigns.filter(c => c.status === status).map((campaign, idx) => (
                                                        <motion.div
                                                            key={campaign.id}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="w-full"
                                                        >
                                                            <CampaignBadgeCard 
                                                                campaign={campaign} 
                                                                creators={creators}
                                                                onSelect={() => navigate('/admin/campaigns/manage/' + campaign.id)}
                                                                onEdit={() => handleEdit(campaign)}
                                                                onDelete={handleDeleteCampaign}
                                                                updateCampaign={handleUpdateCampaignStatus}
                                                                onCopyLink={() => handleCopyLink(campaign.id)}
                                                                isUpdating={isUpdating}
                                                            />
                                                        </motion.div>
                                                    ))}
                                                    {paginatedCampaigns.filter(c => c.status === status).length === 0 && (
                                                        <div className="h-32 rounded-2xl border-2 border-dashed border-black/5 dark:border-white/5 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-zinc-600">
                                                            No {status.toLowerCase()} campaigns found
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-6 px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] border-b border-black/10 dark:border-white/5">
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
                                                creators={creators}
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
                                    <div className="flex items-center justify-center gap-2 mt-12 pb-12">
                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-10 h-10 rounded-xl bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-gray-600 dark:text-gray-400 disabled:opacity-30 hover:border-black/20 dark:hover:border-white/20 transition-all">
                                            <ChevronLeft size={16} />
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                            {getPageNumbers(currentPage, totalPages).map((page, i) => {
                                                if (page === '...') {
                                                    return (
                                                        <span 
                                                            key={`dots-${i}`} 
                                                            className="w-10 h-10 flex items-center justify-center text-gray-500 font-bold text-xs select-none"
                                                        >
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl font-bold text-[10px] transition-all border flex items-center justify-center",
                                                            currentPage === page 
                                                                ? "bg-black text-white dark:bg-white dark:text-black shadow-sm border-transparent" 
                                                                : "bg-white dark:bg-[#0c0e14] border-black/[0.08] dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20"
                                                        )}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-10 h-10 rounded-xl bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-gray-600 dark:text-gray-400 disabled:opacity-30 hover:border-black/20 dark:hover:border-white/20 transition-all">
                                            <ChevronRight size={16} />
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

    const content = (isCreating || expandedCampaignId || isEmbedded) ? (
        <div className="relative z-10">
            {isEmbedded && (
                <div className="flex justify-end mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-stretch">
                        <div className="w-full md:w-64 shrink-0 flex flex-col items-stretch">
                            <StatCard 
                                compact={true} 
                                icon={<Zap size={20} />} 
                                label="ACTIVE CAMPAIGNS" 
                                value={stats.active} 
                                color="green" 
                                description={`${stats.total} Total Units`} 
                            />
                        </div>
                        <div className="w-full md:w-64 shrink-0 flex flex-col items-stretch">
                            <StatCard 
                                compact={true} 
                                icon={<Clock size={20} />} 
                                label="PENDING REVIEW" 
                                value={stats.pending} 
                                color="yellow" 
                                description="Awaiting Verification" 
                            />
                        </div>
                    </div>
                </div>
            )}
            {renderContent()}
        </div>
    ) : (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CREATOR',
                subtitle: 'PORTAL',
                icon: Users,
                accentClass: 'text-neon-pink'
            }}
            accentColor="neon-pink"
            tabs={personnelTabs}
            action={
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-stretch">
                    <div className="w-full md:w-64 shrink-0 flex flex-col items-stretch">
                        <StatCard 
                            compact={true} 
                            icon={<Zap size={20} />} 
                            label="ACTIVE CAMPAIGNS" 
                            value={stats.active} 
                            color="green" 
                            description={`${stats.total} Total Units`} 
                        />
                    </div>
                    <div className="w-full md:w-64 shrink-0 flex flex-col items-stretch">
                        <StatCard 
                            compact={true} 
                            icon={<Clock size={20} />} 
                            label="PENDING REVIEW" 
                            value={stats.pending} 
                            color="yellow" 
                            description="Awaiting Verification" 
                        />
                    </div>
                </div>
            }
        >
            {renderContent()}
        </AdminCommunityHubLayout>
    );

    return (
        <>
            {(isCreating || expandedCampaignId) && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(46,191,255,0.08),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_30%,transparent_100%)]" />
                    <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
            )}
            {content}
            
            {createPortal(
                <AnimatePresence>
                    {rejectionModal && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-md" onClick={() => setRejectionModal(null)} />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl z-10">
                                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white mb-6">REJECTION FEEDBACK</h3>
                                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Provide specific reasons for rejection..." className="w-full h-40 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl p-6 text-sm text-gray-900 dark:text-white focus:border-red-500/50 outline-none transition-all resize-none mb-6 placeholder:text-gray-400 dark:placeholder:text-gray-600" />
                                <div className="flex gap-4">
                                    <button onClick={() => setRejectionModal(null)} className="flex-1 h-14 rounded-xl border border-black/10 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all">Cancel</button>
                                    <button 
                                        onClick={confirmRejection} 
                                        disabled={isReviewing}
                                        className="flex-1 h-14 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-lg"
                                    >
                                        {isReviewing ? <LoadingSpinner size="xs" color="white" /> : 'Confirm Rejection'}
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
}/* --- Detailed Mission Modal --- */

const CampaignDetailView = ({ campaignId, onClose, onEdit, onToggleShortlist, onReviewSubmission, onDelete, updateCampaign, onCopyLink, onCopyTaskLink }) => {
    const { campaigns, creators } = useStore();
    const campaign = campaigns.find(c => c.id === campaignId);
    const [activeTab, setActiveTab] = useState('applicants'); // applicants | tasks

    if (!campaign) return null;

    const appliedCreators = creators.filter(c => (c.joinedCampaigns || []).includes(campaign.id));
    const approvedCreators = appliedCreators.filter(c => (c.shortlistedCampaigns || []).includes(campaign.id));
    const spotsInfo = getCampaignSpotsInfo(campaign, creators);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full space-y-8 pb-20 pt-4"
        >
            {/* Back Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 dark:border-white/5 pb-6">
                <button 
                    onClick={onClose} 
                    className="group flex items-center gap-3 px-6 py-3.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-white hover:text-black transition-all text-xs font-black uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400 hover:text-black shadow-lg backdrop-blur-xl w-fit"
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
                            campaign.status === 'Open' ? "bg-neon-green/10 border-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black" : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        {campaign.status === 'Open' ? <Unlock size={14} /> : <Lock size={14} />}
                        {campaign.status === 'Open' ? 'ACTIVE (CLICK TO CLOSE)' : 'CLOSED (CLICK TO OPEN)'}
                    </button>
                    <button 
                        onClick={onCopyLink} 
                        className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white flex items-center justify-center hover:bg-white hover:text-black transition-all shadow-xl backdrop-blur-xl"
                        title="Share Campaign"
                    >
                        <Share2 size={18} />
                    </button>
                    <button 
                        onClick={() => onEdit(campaign)} 
                        className="h-12 px-6 bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 text-gray-900 dark:text-white font-black uppercase tracking-widest rounded-full hover:bg-white hover:text-black transition-all text-xs flex items-center gap-2 shadow-xl backdrop-blur-xl"
                    >
                        <Edit size={14} /> EDIT BRIEF
                    </button>
                    <button 
                        onClick={() => onDelete(campaign.id)} 
                        className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-gray-900 dark:hover:text-white transition-all shadow-xl backdrop-blur-xl"
                        title="Delete Campaign"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Campaign Hero Card */}
            <div className="relative bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 md:p-10 shadow-sm dark:shadow-none overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gray-50 dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.08] overflow-hidden shrink-0 group relative flex items-center justify-center font-heading font-black text-gray-400 text-xs tracking-widest">
                            {campaign.thumbnail ? (
                                <img src={campaign.thumbnail} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <span>No Image</span>
                            )}
                            <div className="absolute top-2 right-2">
                                <StatusPill status={campaign.status} />
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 min-w-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="flex items-center gap-1.5 text-neon-green font-black tracking-widest text-[9px] uppercase">
                                        <Target size={12} /> CAMPAIGN BRIEF
                                    </span>
                                    {(campaign.brand || campaign.brandLogo) && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                                            {campaign.brandLogo && (
                                                <img src={campaign.brandLogo} alt="" className="w-3.5 h-3.5 rounded object-contain shrink-0" />
                                            )}
                                            {campaign.brand && (
                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-neon-green">
                                                    {campaign.brand}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <h1 className="text-2xl sm:text-4xl font-heading font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                                    {campaign.title}
                                </h1>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <span className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 rounded-full text-gray-600 dark:text-zinc-400">
                                    <MapPin size={12} className="text-neon-pink" /> {campaign.targetCity || 'GLOBAL'}
                                </span>
                                {campaign.targetCollege && campaign.targetCollege !== 'Any' && (
                                    <span className="flex items-center gap-1.5 bg-neon-blue/10 border border-neon-blue/20 px-3 py-1.5 rounded-full text-neon-blue">
                                        <Layers size={12} /> {campaign.targetCollege}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-700 dark:text-neon-green">
                                    <IndianRupee size={12} /> {campaign.reward}
                                </span>
                                <span className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full text-purple-600 dark:text-purple-400">
                                    <Users size={12} /> {campaign.minInstagramFollowers ? `${campaign.minInstagramFollowers}+ FOLLOWERS REQ.` : 'ANY FOLLOWERS'}
                                </span>
                                {spotsInfo.hasSpots && (
                                    <span className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border",
                                        spotsInfo.isFull 
                                            ? "bg-red-500/10 border-red-500/20 text-red-500" 
                                            : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                    )}>
                                        <Users size={12} /> {spotsInfo.isFull ? '0 SPOTS LEFT (FULL)' : `${spotsInfo.spotsLeft} SPOTS LEFT`} ({appliedCreators.length} APPLIED{spotsInfo.totalSpots ? ` / ${spotsInfo.totalSpots} TOTAL` : ''})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {campaign.whatsappLink && (
                        <a 
                            href={campaign.whatsappLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="group flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-600 dark:text-emerald-400 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shrink-0 w-full lg:w-auto justify-center"
                        >
                            <ExternalLink size={16} className="group-hover:rotate-45 transition-transform" />
                            JOIN WHATSAPP
                        </a>
                    )}
                </div>

                {campaign.description && (
                    <div className="mt-6 pt-6 border-t border-black/[0.08] dark:border-white/[0.08] text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: campaign.description }} />
                )}
            </div>

            {/* Tabs & Content */}
            <div className="space-y-6">
                <div className="flex gap-2 border-b border-black/[0.08] dark:border-white/[0.08]">
                    {['applicants', 'tasks'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "relative px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2",
                                activeTab === tab ? "text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                            )}
                        >
                            {tab === 'applicants' ? 'APPLICATIONS' : 'CAMPAIGN TASKS'}
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/5 dark:bg-white/5">
                                {tab === 'applicants' ? appliedCreators.length : (campaign.tasks?.length || 0)}
                            </span>
                            {activeTab === tab && (
                                <motion.div layoutId="tab-underline" className="absolute -bottom-px left-0 right-0 h-0.5 bg-neon-green" />
                            )}
                        </button>
                    ))}
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
                                {appliedCreators.length === 0 ? (
                                    <div className="py-16 text-center bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl flex flex-col items-center gap-4">
                                        <Users size={32} className="text-gray-400" />
                                        <div className="space-y-1">
                                            <p className="text-base font-heading font-black text-gray-900 dark:text-white">No Applications Yet</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Creators who apply will appear here</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                                        {appliedCreators.map(creator => {
                                            const isShortlisted = (creator.shortlistedCampaigns || []).includes(campaign.id);
                                            return (
                                                <div key={creator.uid} className={cn("p-5 rounded-2xl border transition-all duration-300 group relative overflow-hidden bg-white dark:bg-[#0c0e14]", isShortlisted ? "border-neon-green/40 shadow-sm" : "border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20")}>
                                                    <div className="flex items-start justify-between mb-5">
                                                        <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-lg font-heading font-black text-gray-900 dark:text-white">{creator.name.charAt(0)}</div>
                                                        <button 
                                                            onClick={() => onToggleShortlist(creator.uid, campaign.id)}
                                                            className={cn(
                                                                "px-3 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center",
                                                                isShortlisted ? "bg-neon-green text-black border-transparent shadow-sm" : "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                                                            )}
                                                        >
                                                            {isShortlisted ? '✓ SHORTLISTED' : '+ SHORTLIST'}
                                                        </button>
                                                    </div>
                                                    <h4 className="text-lg font-heading font-black text-gray-900 dark:text-white tracking-tight mb-2 group-hover:text-neon-green transition-colors">{creator.name}</h4>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest bg-black/5 dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 rounded-full w-fit">
                                                        <Instagram size={12} className="text-neon-pink" /> {Number(creator.instagramFollowers || 0).toLocaleString()} FOLLOWERS
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {(campaign.tasks || []).length === 0 ? (
                                    <div className="py-16 text-center bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl flex flex-col items-center gap-4">
                                        <Target size={32} className="text-gray-400" />
                                        <div className="space-y-1">
                                            <p className="text-base font-heading font-black text-gray-900 dark:text-white">No Tasks Configured</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Edit the campaign brief to add tasks for creators</p>
                                        </div>
                                    </div>
                                ) : (campaign.tasks || []).map((task, idx) => (
                                    <div key={task.id} className="space-y-6 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-5 md:p-8 shadow-sm dark:shadow-none">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] dark:border-white/[0.08] pb-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center font-black text-emerald-700 dark:text-neon-green text-base">{idx + 1}</div>
                                                <div>
                                                    <h4 className="text-xl font-heading font-black text-gray-900 dark:text-white tracking-tight mb-1">{task.title}</h4>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{task.platform} TASK</p>
                                                        {task.deadline && (
                                                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                                                DEADLINE: {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onCopyTaskLink(task.id)}
                                                className="h-10 px-4 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-gray-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 w-fit"
                                                title="Share Task Link"
                                            >
                                                <Share2 size={14} /> SHARE TASK
                                            </button>
                                        </div>

                                        {task.googleFormLink && (
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-purple-500/[0.06] dark:bg-purple-500/[0.12] border border-purple-500/20 text-xs">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <FileText size={15} className="text-purple-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-black uppercase tracking-wider text-[10px] font-mono text-purple-700 dark:text-purple-300">Google Form Submission:</span>
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-700 dark:text-purple-200 font-mono">New Tab (File Upload)</span>
                                                        </div>
                                                        <span className="font-mono text-[11px] text-gray-600 dark:text-zinc-300 truncate block mt-0.5">{task.googleFormLink}</span>
                                                    </div>
                                                </div>
                                                <a href={task.googleFormLink} target="_blank" rel="noopener noreferrer" className="shrink-0 h-8 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase font-mono flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95">
                                                    <span>Open Form</span>
                                                    <ExternalLink size={11} />
                                                </a>
                                            </div>
                                        )}

                                        {task.description && (
                                            <div className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed prose prose-invert max-w-none bg-gray-50 dark:bg-black/20 p-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]" dangerouslySetInnerHTML={{ __html: task.description }} />
                                        )}

                                        {/* Task Verification Dashboard */}
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                    <CheckCircle2 size={14} className="text-neon-green" /> TASK VERIFICATION & SUBMISSIONS
                                                </h5>
                                                <div className="px-3 py-1 bg-neon-green/10 rounded-full text-[9px] font-black text-emerald-700 dark:text-neon-green uppercase tracking-widest border border-neon-green/20">
                                                    Awaiting {Object.values(task.submissions || {}).filter(s => s.status === 'submitted').length} Reviews
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {approvedCreators.length === 0 ? (
                                                    <div className="p-6 text-center bg-gray-50 dark:bg-black/20 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                                        No shortlisted creators assigned to this campaign yet.
                                                    </div>
                                                ) : approvedCreators.map(creator => {
                                                    const sub = task.submissions?.[creator.uid];
                                                    const status = sub?.status || 'not_started';
                                                    
                                                    return (
                                                        <div key={creator.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#0c0e14] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] group hover:border-black/20 dark:hover:border-white/20 transition-all gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center font-heading font-black text-gray-900 dark:text-white">{creator.name.charAt(0)}</div>
                                                                <div>
                                                                    <p className="text-sm font-heading font-black text-gray-900 dark:text-white tracking-tight mb-0.5">{creator.name}</p>
                                                                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono", 
                                                                        status === 'approved' ? "bg-emerald-500/15 text-emerald-700 dark:text-neon-green" : 
                                                                        status === 'submitted' ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : 
                                                                        status === 'rejected' ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-black/5 dark:bg-white/5 text-gray-500"
                                                                    )}>
                                                                        {status.replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-3">
                                                                {sub?.submissionUrl && (
                                                                    <a href={sub.submissionUrl} target="_blank" rel="noreferrer" className="h-9 px-4 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:border-black/20 dark:hover:border-white/20 text-gray-800 dark:text-zinc-200 transition-all">
                                                                        <ExternalLink size={12} /> VIEW SUBMISSION
                                                                    </a>
                                                                )}
                                                                {status === 'submitted' && (
                                                                    <div className="flex gap-2">
                                                                        <button 
                                                                            onClick={() => onReviewSubmission(campaign.id, task.id, creator.uid, 'approved')} 
                                                                            disabled={isReviewing}
                                                                            className="h-9 px-4 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-neon-green border border-emerald-500/20 flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all text-[10px] font-black uppercase tracking-wider"
                                                                            title="Approve Submission"
                                                                        >
                                                                            {isReviewing ? <LoadingSpinner size="xs" color="neon-green" /> : <Check size={14} />} APPROVE
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => onReviewSubmission(campaign.id, task.id, creator.uid, 'rejected')} 
                                                                            disabled={isReviewing}
                                                                            className="h-9 px-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-wider"
                                                                            title="Reject Submission"
                                                                        >
                                                                            {isReviewing ? <LoadingSpinner size="xs" color="red" /> : <X size={14} />} REJECT
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
