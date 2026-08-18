import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Shield from 'lucide-react/dist/esm/icons/shield';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Activity from 'lucide-react/dist/esm/icons/activity';
import X from 'lucide-react/dist/esm/icons/x';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Star from 'lucide-react/dist/esm/icons/star';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Music from 'lucide-react/dist/esm/icons/music';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';

import { Card } from '../../components/ui/Card';
import { useStore } from '../../lib/store';
import { useConsolidatedMembers } from '../../hooks/useConsolidatedMembers';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const getPageNumbers = (currentPage, totalPages) => {
    const pages = [];
    const delta = 2;
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
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
                if (i - l === 2) pages.push(l + 1);
                else if (i - l > 2) pages.push('...');
            }
            pages.push(i);
            l = i;
        }
    }
    return pages;
};

const ActiveUsers = () => {
    const { user, blockUser, creators = [], artists = [], campusProfiles = [] } = useStore();
    const { activeMembers, totalCount } = useConsolidatedMembers();

    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const filteredActiveUsers = useMemo(() => {
        return activeMembers.filter(m => {
            const matchesSearch = ((m.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                   (m.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                   (m.phone || '').toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchesSearch) return false;

            if (activeFilter === 'tribe') return m.hasJoinedTribe;
            if (activeFilter === 'creators') return m.isCreator || creators.some(c => c.uid === m.id || c.email === m.email);
            if (activeFilter === 'artists') return m.isArtist || artists.some(a => (a.uid === m.id || a.email === m.email) && a.profileStatus === 'approved');
            if (activeFilter === 'campus') return m.isCampus || campusProfiles.some(cp => cp.uid === m.id || cp.email === m.email);
            if (activeFilter === 'tickets') return m.isTicketHolder;

            return true;
        });
    }, [activeMembers, searchTerm, activeFilter, creators, artists, campusProfiles]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeFilter]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredActiveUsers.slice(start, start + itemsPerPage);
    }, [filteredActiveUsers, currentPage]);

    const totalPages = Math.ceil(filteredActiveUsers.length / itemsPerPage) || 1;

    const handleBlockUser = async (member) => {
        if (window.confirm(`Suspend clearance for ${member.email}? They won't be able to access their account.`)) {
            try {
                await blockUser(member.id);
                useStore.getState().addToast(`Suspended ${member.displayName || member.email}.`, 'success');
            } catch (error) {
                useStore.getState().addToast("Something went wrong. Please try again.", 'error');
            }
        }
    };

    const handleRevokeSessions = async (member) => {
        if (window.confirm(`Are you sure you want to log ${member.displayName || member.email} out of all devices?`)) {
            try {
                await useStore.getState().revokeSessions(member.id, member.email);
                useStore.getState().addToast(`Successfully logged out all devices for ${member.displayName || member.email}.`, 'success');
            } catch (error) {
                useStore.getState().addToast(error.message || "Failed to revoke sessions", 'error');
            }
        }
    };

    if (user?.role !== 'super_admin' && user?.role !== 'developer' && user?.role !== 'founder' && user?.role !== 'content_admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020202]">
                <div className="text-center p-12 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] max-w-md mx-auto">
                    <ShieldAlert size={48} className="mx-auto mb-6 text-red-500" />
                    <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white">ACCESS DENIED</h1>
                    <p className="text-gray-500 mt-4 text-sm font-medium">You don't have permission to view this page.</p>
                    <Link to="/admin" className="text-neon-blue mt-8 inline-block font-black uppercase text-[10px] tracking-widest hover:underline">Return to Admin Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'Active Personnel',
                subtitle: 'Live Roster',
                icon: UserCheck,
                accentClass: 'text-neon-green'
            }}
            accentColor="neon-green"
            hideTabs={true}
            action={
                <Link
                    to="/admin/manage-admins"
                    className="w-full md:w-auto flex items-center justify-center gap-3 h-12 md:h-14 px-8 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase text-[10px] tracking-widest transition-all duration-300"
                >
                    <Users size={14} className="text-neon-blue" />
                    View All Registered Members ({totalCount})
                </Link>
            }
        >
            {/* Quick Metrics KPI Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
                {[
                    { 
                        label: 'Active Users', 
                        count: activeMembers.length, 
                        detail: `Out of ${totalCount} Registered`, 
                        color: 'text-neon-green', 
                        bgGlow: 'bg-neon-green',
                        hoverBorder: 'group-hover:border-neon-green/30',
                        topGradient: 'from-neon-green to-emerald-500'
                    },
                    { 
                        label: 'Active Tribe & Creators', 
                        count: activeMembers.filter(m => m.hasJoinedTribe || m.isCreator || m.isArtist || m.isCampus).length, 
                        detail: 'Verified Active Members', 
                        color: 'text-neon-pink', 
                        bgGlow: 'bg-neon-pink',
                        hoverBorder: 'group-hover:border-neon-pink/30',
                        topGradient: 'from-neon-pink to-purple-500'
                    },
                    { 
                        label: 'Active Ticket Holders', 
                        count: activeMembers.filter(m => m.isTicketHolder).length, 
                        detail: 'Event Attendees', 
                        color: 'text-neon-blue', 
                        bgGlow: 'bg-neon-blue',
                        hoverBorder: 'group-hover:border-neon-blue/30',
                        topGradient: 'from-neon-blue to-blue-500'
                    },
                    { 
                        label: 'Active Admins & Staff', 
                        count: activeMembers.filter(m => m.isAdmin).length, 
                        detail: 'Command Staff', 
                        color: 'text-yellow-400', 
                        bgGlow: 'bg-yellow-400',
                        hoverBorder: 'group-hover:border-yellow-400/30',
                        topGradient: 'from-yellow-400 to-amber-500'
                    }
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative h-full flex flex-col items-stretch"
                    >
                        <div className={cn(
                            "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl pointer-events-none",
                            stat.bgGlow
                        )} />
                        
                        <div className={cn(
                            "relative z-10 p-6 md:p-8 h-full bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl transition-all duration-500 flex flex-col justify-between group-hover:-translate-y-1",
                            stat.hoverBorder
                        )}>
                            <div className={cn("absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r rounded-t-3xl", stat.topGradient)} />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 leading-none relative z-10">{stat.label}</p>
                            <div className="flex items-baseline gap-2.5 relative z-10">
                                <span className={cn("text-3xl md:text-4xl font-extrabold font-heading tracking-tight leading-none", stat.color)}>{stat.count}</span>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide truncate">{stat.detail}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Combined Search & Filters Bar */}
            <div className="bg-zinc-950/60 border border-white/10 rounded-[2rem] xl:rounded-full p-2 mb-8 md:mb-12 backdrop-blur-3xl flex flex-col xl:flex-row items-center gap-2 md:gap-4 shadow-2xl">
                {/* Search Input */}
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition-colors" size={18} />
                    <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search active personnel by name, email, or phone..."
                        className="w-full bg-transparent h-14 md:h-16 pl-16 md:pl-20 pr-12 rounded-full text-[9px] md:text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Sub-Filters & Layout Switcher */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="flex items-center bg-black/40 p-1.5 rounded-full border border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-1 w-full">
                            {[
                                { id: 'all', label: 'All Active' },
                                { id: 'tribe', label: 'Tribe' },
                                { id: 'creators', label: 'Creators' },
                                { id: 'artists', label: 'Artists' },
                                { id: 'campus', label: 'Campus' },
                                { id: 'tickets', label: 'Ticket Holders' }
                            ].map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={cn(
                                        "flex-1 px-4 sm:px-6 py-3.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[70px] sm:min-w-[90px] md:min-w-[110px] flex items-center justify-center text-center leading-none border",
                                        activeFilter === filter.id 
                                            ? "bg-neon-green/10 text-neon-green border-neon-green/20 font-extrabold scale-[1.02]" 
                                            : "text-gray-500 hover:text-white hover:bg-white/5 border-transparent"
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-black/40 p-1.5 rounded-full border border-white/10 gap-1 shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-3 rounded-full transition-all duration-300",
                                viewMode === 'grid' ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "text-gray-500 hover:text-white"
                            )}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-3 rounded-full transition-all duration-300",
                                viewMode === 'table' ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "text-gray-500 hover:text-white"
                            )}
                            title="Table View"
                        >
                            <Activity size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key="active-users-list"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                >
                    {filteredActiveUsers.length === 0 ? (
                        <div className="py-24 text-center bg-white/[0.01] border border-white/5 rounded-[2rem]">
                            <UserCheck size={32} className="mx-auto text-gray-700 mb-4 animate-pulse" />
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No matching active personnel found</p>
                        </div>
                    ) : (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {paginatedUsers.map(member => {
                                    const isTribe = member.hasJoinedTribe;
                                    const isCreator = member.isCreator || creators?.some(c => c.uid === member.id || c.email === member.email);
                                    const isArtist = member.isArtist || artists?.some(a => (a.uid === member.id || a.email === member.email) && a.profileStatus === 'approved');
                                    const isCampus = member.isCampus || campusProfiles?.some(cp => cp.uid === member.id || cp.email === member.email);

                                    return (
                                        <motion.div
                                            key={member.id || member.email}
                                            layout
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="group relative flex flex-col h-full"
                                        >
                                            {/* Hover Glow */}
                                            <div className="absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-10 transition-opacity blur-2xl duration-700 pointer-events-none bg-gradient-to-br from-neon-green/30 to-neon-blue/30" />
                                            
                                            <Card className="relative p-6 sm:p-8 bg-zinc-950/60 group-hover:bg-zinc-900/40 hover:border-white/10 border-white/5 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-xl flex flex-col justify-between h-full min-h-[380px] overflow-hidden border hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] gap-6">
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent opacity-100 pointer-events-none" />
                                                
                                                {/* Header Section */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-5">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-full border font-black uppercase tracking-widest text-[8px]",
                                                            isArtist ? "bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B]" :
                                                            isCreator ? "bg-neon-pink/10 border-neon-pink/20 text-neon-pink" :
                                                            isCampus ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-400" :
                                                            isTribe ? "bg-neon-blue/10 border-neon-blue/20 text-neon-blue" :
                                                            "bg-white/5 border-white/5 text-gray-500"
                                                        )}>
                                                            {isArtist ? "Artist" : isCreator ? "Creator" : isCampus ? "Campus" : isTribe ? "Tribe" : "Standard"}
                                                        </span>
                                                        
                                                        <span className="px-3 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                                                            ACTIVE CLEARANCE
                                                        </span>
                                                    </div>

                                                    {/* Display Name */}
                                                    <div className="space-y-1">
                                                        <h3 className="font-heading font-black text-2xl sm:text-3xl text-white group-hover:text-neon-green transition-colors duration-500 uppercase italic tracking-tighter leading-[0.95] line-clamp-2 pr-4">
                                                            {member.displayName || 'UNNAMED_SUBJECT'}
                                                        </h3>
                                                        <p className="text-[10px] text-gray-500 font-mono select-all leading-relaxed break-all">{member.email}</p>
                                                        {member.phone && (
                                                            <p className="text-[9px] text-gray-600 font-mono mt-0.5">{member.phone}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Metadata Pods */}
                                                <div className="space-y-2.5 mt-auto">
                                                    <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] bg-white/[0.02] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                                                        <span className="text-gray-600">REGISTERED:</span>
                                                        <span className="text-gray-400 font-mono">{member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] bg-white/[0.02] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                                                        <span className="text-gray-600">STATUS:</span>
                                                        <span className="text-neon-green font-mono">AUTHORIZED ONLINE</span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="pt-4 border-t border-white/5 w-full mt-auto flex flex-col gap-2">
                                                    <button 
                                                        onClick={() => handleBlockUser(member)} 
                                                        className="w-full h-12 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-500 font-black uppercase tracking-widest text-[9px] rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-2 duration-300 active:scale-95"
                                                    >
                                                        <ShieldAlert size={12} /> Suspend Clearance
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRevokeSessions(member)}
                                                        className="w-full h-12 bg-white/5 hover:bg-red-500/15 text-gray-400 hover:text-red-500 font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/5 hover:border-red-500/20 transition-all flex items-center justify-center gap-2 duration-300 active:scale-95"
                                                    >
                                                        <LogOut size={12} /> Log out all devices
                                                    </button>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-36 -mb-36">
                                <Card className="min-w-[800px] bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-0 border">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                                <th className="p-6 md:p-8">Active Personnel</th>
                                                <th className="p-6 md:p-8">Clearance</th>
                                                <th className="p-6 md:p-8">Affiliation</th>
                                                <th className="p-6 md:p-8">Registered</th>
                                                <th className="p-6 md:p-8 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {paginatedUsers.map(member => {
                                                const isTribe = member.hasJoinedTribe;
                                                const isCreator = member.isCreator || creators?.some(c => c.uid === member.id || c.email === member.email);
                                                const isArtist = member.isArtist || artists?.some(a => (a.uid === member.id || a.email === member.email) && a.profileStatus === 'approved');
                                                const isCampus = member.isCampus || campusProfiles?.some(cp => cp.uid === member.id || cp.email === member.email);

                                                return (
                                                    <tr key={member.id || member.email} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-6 md:p-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green flex items-center justify-center text-xs font-black italic tracking-tighter relative shadow-md shrink-0 select-none">
                                                                    {member.displayName?.charAt(0) || 'U'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-heading font-black text-white group-hover:text-neon-green transition-colors uppercase italic text-sm">
                                                                        {member.displayName || 'UNNAMED_SUBJECT'}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-500 font-mono">{member.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 md:p-8">
                                                            <span className="px-3 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-widest">AUTHORIZED</span>
                                                        </td>
                                                        <td className="p-6 md:p-8">
                                                            <span className={cn(
                                                                "px-3 py-1 rounded-full border font-black uppercase tracking-widest text-[8px]",
                                                                isArtist ? "bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B]" :
                                                                isCreator ? "bg-neon-pink/10 border-neon-pink/20 text-neon-pink" :
                                                                isCampus ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-400" :
                                                                isTribe ? "bg-neon-blue/10 border-neon-blue/20 text-neon-blue" :
                                                                "bg-white/5 border-white/5 text-gray-500"
                                                            )}>
                                                                {isArtist ? "Artist" : isCreator ? "Creator" : isCampus ? "Campus" : isTribe ? "Tribe" : "Standard"}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 md:p-8 text-[10px] font-mono text-gray-400">
                                                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                                        </td>
                                                        <td className="p-6 md:p-8 text-right space-x-2">
                                                            <button
                                                                onClick={() => handleBlockUser(member)}
                                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-500 font-black uppercase tracking-widest text-[8px] rounded-lg border border-red-500/20 transition-all"
                                                            >
                                                                Suspend
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </Card>
                            </div>
                        )
                    )}

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredActiveUsers.length)} of {filteredActiveUsers.length} active personnel
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white rounded-xl transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {getPageNumbers(currentPage, totalPages).map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => typeof p === 'number' && setCurrentPage(p)}
                                        disabled={typeof p !== 'number'}
                                        className={cn(
                                            "min-w-[40px] h-10 px-3 rounded-xl text-[10px] font-black font-mono transition-all",
                                            currentPage === p ? "bg-neon-green text-black font-extrabold" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white rounded-xl transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </AdminCommunityHubLayout>
    );
};

export default ActiveUsers;
