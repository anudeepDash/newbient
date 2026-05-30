import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Clock from 'lucide-react/dist/esm/icons/clock';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import Mail from 'lucide-react/dist/esm/icons/mail';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Activity from 'lucide-react/dist/esm/icons/activity';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import StudioSelect from '../../components/ui/StudioSelect';

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

const getAdminRoleOptions = (currentRole, canManageDevelopers) => {
    const opts = [
        { value: 'content_admin', label: 'Content Admin' },
        { value: 'gate_manager', label: 'Gate Manager' },
        { value: 'blog_writer', label: 'Blog Writer' },
        { value: 'super_admin', label: 'Super Admin' },
        ...(canManageDevelopers ? [{ value: 'developer', label: 'Developer' }] : [])
    ];
    // Include legacy fallback options in list if they are currently active in DB
    if (currentRole === 'editor' && !opts.some(o => o.value === 'editor')) {
        opts.push({ value: 'editor', label: 'Content Admin (Legacy)' });
    }
    if (currentRole === 'scanner' && !opts.some(o => o.value === 'scanner')) {
        opts.push({ value: 'scanner', label: 'Gate Manager (Legacy)' });
    }
    return opts;
};

const getSelectAccentColor = (role) => {
    if (role === 'super_admin' || role === 'developer') return 'neon-pink';
    if (role === 'content_admin' || role === 'editor') return 'neon-green';
    return 'neon-blue';
};

const AdminManager = () => {
    const { user, blockUser, unblockUser, creators, artists } = useStore();
    const [activeTab, setActiveTab] = useState('members');

    // Admin State
    const [admins, setAdmins] = useState([]);
    const pendingRequests = admins.filter(a => a.role === 'pending');
    const [loadingAdmins, setLoadingAdmins] = useState(true);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminRole, setNewAdminRole] = useState('content_admin');

    // Member State
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [memberSearch, setMemberSearch] = useState('');

    // Pagination & Filter State
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const [memberFilter, setMemberFilter] = useState('all');
    const [adminFilter, setAdminFilter] = useState('all');
    const itemsPerPage = 12;

    const fetchAdmins = async () => {
        setLoadingAdmins(true);
        try {
            const querySnapshot = await getDocs(collection(db, "admins"));
            const adminList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAdmins(adminList);
        } catch (error) {
            console.error("Error fetching admins:", error);
        } finally {
            setLoadingAdmins(false);
        }
    };

    const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const memberList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            memberList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setMembers(memberList);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoadingMembers(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
        fetchMembers();
    }, []);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        try {
            const q = query(collection(db, "admins"), where("email", "==", newAdminEmail));
            const existing = await getDocs(q);
            if (!existing.empty) {
                useStore.getState().addToast("This person is already an admin.", 'error');
                return;
            }

            await addDoc(collection(db, "admins"), {
                email: newAdminEmail,
                role: newAdminRole,
                addedBy: user.email,
                createdAt: new Date().toISOString()
            });

            setNewAdminEmail('');
            fetchAdmins();
            useStore.getState().addToast("Admin added! They'll need to sign up to get started.", 'success');
        } catch (error) {
            console.error("Error adding admin:", error);
            useStore.getState().addToast("Couldn't add the admin. Please try again.", 'error');
        }
    };

    const handleApprove = async (id, role) => {
        try {
            await updateDoc(doc(db, "admins", id), { role: role });
            fetchAdmins();
            useStore.getState().addToast(`Role updated to ${role}.`, 'success');
        } catch (error) {
            console.error("Error approving admin:", error);
            useStore.getState().addToast("Couldn't update the role. Please try again.", 'error');
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        try {
            await updateDoc(doc(db, "admins", id), { role: newRole });
            fetchAdmins();
        } catch (error) {
            console.error("Error updating role:", error);
            useStore.getState().addToast("Couldn't update the role. Please try again.", 'error');
        }
    };

    const handleRemoveAdmin = async (id, targetRole) => {
        if (!canEditRoles(targetRole)) {
            useStore.getState().addToast("You don't have permission to change this person's role.", 'error');
            return;
        }

        if (window.confirm('Remove this admin? They will lose all admin access immediately.')) {
            try {
                await deleteDoc(doc(db, "admins", id));
                fetchAdmins();
            } catch (error) {
                console.error("Error removing admin:", error);
                useStore.getState().addToast("Couldn't remove the admin. Please try again.", 'error');
            }
        }
    };

    const handleBlockUser = async (member) => {
        if (window.confirm(`Block ${member.email}? They won't be able to access their account.`)) {
            try {
                await blockUser(member.id);
                fetchMembers();
            } catch (error) {
                useStore.getState().addToast("Something went wrong. Please try again.", 'error');
            }
        }
    };

    const handleUnblockUser = async (member) => {
        if (window.confirm(`Unblock ${member.email}? They'll be able to access their account again.`)) {
            try {
                await unblockUser(member.id);
                fetchMembers();
            } catch (error) {
                useStore.getState().addToast("Something went wrong. Please try again.", 'error');
            }
        }
    };

    const [isInviteOpen, setIsInviteOpen] = useState(false);

    const canManageDevelopers = user?.role === 'developer';
    const displayAdmins = canManageDevelopers
        ? admins
        : admins.filter(a => a.role !== 'developer');

    const canEditRoles = (targetRole) => {
        if (user.role === 'developer') return true;
        if (user.role === 'super_admin' && (targetRole === 'editor' || targetRole === 'pending' || targetRole === 'scanner' || targetRole === 'content_admin' || targetRole === 'gate_manager' || targetRole === 'blog_writer')) return true;
        return false;
    };

    if (user?.role !== 'super_admin' && user?.role !== 'developer') {
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

    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchesSearch = ((m.email || '').toLowerCase().includes((memberSearch || '').toLowerCase()) ||
                                   (m.displayName || '').toLowerCase().includes((memberSearch || '').toLowerCase()));
            if (!matchesSearch) return false;

            if (memberFilter === 'authorized') return !m.isBlocked;
            if (memberFilter === 'suspended') return m.isBlocked;
            if (memberFilter === 'tribe') return m.hasJoinedTribe;
            if (memberFilter === 'creators') return creators?.some(c => c.uid === m.id);
            if (memberFilter === 'artists') return artists?.some(a => a.uid === m.id && a.profileStatus === 'approved');

            return true;
        });
    }, [members, memberSearch, memberFilter, creators, artists]);

    const filteredAdmins = useMemo(() => {
        return displayAdmins.filter(a => {
            if (a.role === 'pending') return false;

            const matchesSearch = ((a.email || '').toLowerCase().includes((memberSearch || '').toLowerCase()) ||
                                   (a.displayName || '').toLowerCase().includes((memberSearch || '').toLowerCase()));
            if (!matchesSearch) return false;

            if (adminFilter !== 'all') {
                if (adminFilter === 'content_admin') {
                    return a.role === 'content_admin' || a.role === 'editor';
                }
                if (adminFilter === 'gate_manager') {
                    return a.role === 'gate_manager' || a.role === 'scanner';
                }
                return a.role === adminFilter;
            }

            return true;
        });
    }, [displayAdmins, memberSearch, adminFilter]);

    const filteredRequests = useMemo(() => {
        return pendingRequests.filter(a =>
            (a.email || '').toLowerCase().includes((memberSearch || '').toLowerCase())
        );
    }, [pendingRequests, memberSearch]);

    // Reset pagination to 1 on filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [memberSearch, memberFilter, adminFilter, activeTab]);

    // Paginated datasets
    const paginatedMembers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMembers.slice(start, start + itemsPerPage);
    }, [filteredMembers, currentPage]);

    const paginatedAdmins = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAdmins.slice(start, start + itemsPerPage);
    }, [filteredAdmins, currentPage]);

    const paginatedRequests = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRequests.slice(start, start + itemsPerPage);
    }, [filteredRequests, currentPage]);

    const totalPages = useMemo(() => {
        const totalItems = activeTab === 'members'
            ? filteredMembers.length
            : (activeTab === 'admins' ? filteredAdmins.length : filteredRequests.length);
        return Math.ceil(totalItems / itemsPerPage) || 1;
    }, [activeTab, filteredMembers.length, filteredAdmins.length, filteredRequests.length]);

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'Access',
                subtitle: 'Registry',
                icon: Shield,
                accentClass: 'text-neon-green'
            }}
            accentColor="neon-green"
            hideTabs={true}
            action={
                activeTab === 'admins' && (
                    <button
                        onClick={() => setIsInviteOpen(!isInviteOpen)}
                        className={cn(
                            "w-full md:w-auto flex items-center justify-center gap-3 h-12 md:h-14 px-8 rounded-xl md:rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all duration-300",
                            isInviteOpen 
                                ? "bg-white/10 text-white border border-white/10 hover:bg-white/15" 
                                : "bg-neon-green text-black hover:scale-[1.02] active:scale-95 shadow-[0_10px_20px_rgba(57,255,20,0.25)]"
                        )}
                    >
                        <UserPlus size={14} />
                        {isInviteOpen ? 'Close Portal' : 'Authorize Staff'}
                    </button>
                )
            }
        >
            {/* Quick Metrics KPI Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
                {[
                    { label: 'Personnel Registry', count: members.length, detail: `${members.filter(m => !m.isBlocked).length} Active`, color: 'text-neon-blue', bgGlow: 'rgba(0,240,255,0.15)' },
                    { label: 'Command Staff', count: admins.filter(a => a.role !== 'pending').length, detail: 'System Operatives', color: 'text-neon-green', bgGlow: 'rgba(57,255,20,0.15)' },
                    { label: 'Tribe & Creators', count: members.filter(m => m.hasJoinedTribe || creators?.some(c => c.uid === m.id) || artists?.some(a => a.uid === m.id && a.profileStatus === 'approved')).length, detail: 'Verified Badges', color: 'text-neon-pink', bgGlow: 'rgba(255,79,139,0.15)' },
                    { label: 'Pending Requests', count: pendingRequests.length, detail: 'Awaiting Auth', color: 'text-yellow-500', bgGlow: 'rgba(234,179,8,0.15)' }
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative"
                    >
                        <div 
                            className="absolute -inset-px rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity blur-xl duration-500 pointer-events-none"
                            style={{ background: `radial-gradient(circle at center, ${stat.bgGlow} 0%, transparent 70%)` }}
                        />
                        <Card className="relative p-6 md:p-8 bg-zinc-950/60 hover:bg-zinc-900/40 border border-white/10 hover:border-neon-green/30 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-300 shadow-2xl overflow-hidden group">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 leading-none">{stat.label}</p>
                            <div className="flex items-baseline gap-2.5">
                                <span className={cn("text-3xl md:text-4xl font-black font-heading italic leading-none", stat.color)}>{stat.count}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate">{stat.detail}</span>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Switcher & Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 border-b border-white/5 pb-8">
                <div className="flex flex-wrap sm:flex-nowrap bg-zinc-950/60 p-1.5 rounded-full border border-white/10 backdrop-blur-3xl gap-1.5 w-full lg:w-auto relative z-10 shadow-lg">
                    {[
                        { id: 'members', label: 'Personnel Registry', count: members.length, icon: Users },
                        { id: 'admins', label: 'Command Staff', count: admins.filter(a => a.role !== 'pending').length, icon: Shield },
                        { id: 'requests', label: 'Clearance Queries', count: pendingRequests.length, icon: Clock }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setMemberSearch('');
                                }}
                                className={cn(
                                    "flex items-center justify-center gap-3 px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative group shrink-0",
                                    isActive ? "text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <tab.icon size={14} className={cn("transition-colors duration-500", isActive ? "text-black" : "text-gray-500 group-hover:text-white")} />
                                <span>{tab.label}</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-bold font-mono transition-colors duration-500",
                                    isActive ? "bg-black/10 text-black" : "bg-white/5 text-gray-500 group-hover:text-white"
                                )}>{tab.count}</span>

                                {isActive && (
                                    <motion.div
                                        layoutId="manager-active-tab"
                                        className="absolute inset-0 bg-neon-green rounded-full -z-10 shadow-[0_10px_25px_rgba(57,255,20,0.35)]"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Combined Search & Filters Bar */}
            <div className="bg-zinc-950/60 border border-white/10 rounded-[2rem] xl:rounded-full p-2 mb-8 md:mb-12 backdrop-blur-3xl flex flex-col xl:flex-row items-center gap-2 md:gap-4 shadow-2xl">
                {/* Search Input */}
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition-colors" size={18} />
                    <input 
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder={
                            activeTab === 'members' 
                                ? "Search personnel registry..." 
                                : (activeTab === 'requests' ? "Search clearance queries..." : "Search active command staff...")
                        }
                        className="w-full bg-transparent h-14 md:h-16 pl-16 md:pl-20 pr-12 rounded-full text-[9px] md:text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600"
                    />
                    {memberSearch && (
                        <button 
                            onClick={() => setMemberSearch('')} 
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filter Tabs & Layout Mode Group */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                    {/* Sub-Filters */}
                    {activeTab === 'members' && (
                        <div className="flex items-center bg-black/40 p-1.5 rounded-full border border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-1 w-full">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'authorized', label: 'Authorized' },
                                    { id: 'suspended', label: 'Suspended' },
                                    { id: 'tribe', label: 'Tribe' },
                                    { id: 'creators', label: 'Creators' },
                                    { id: 'artists', label: 'Artists' }
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setMemberFilter(filter.id)}
                                        className={cn(
                                            "flex-1 px-4 sm:px-6 py-3.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[70px] sm:min-w-[90px] md:min-w-[110px] flex items-center justify-center text-center leading-none",
                                            memberFilter === filter.id 
                                                ? "bg-neon-green text-black shadow-[0_10px_25px_rgba(57,255,20,0.5)] scale-[1.02]" 
                                                : "text-gray-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'admins' && (
                        <div className="flex items-center bg-black/40 p-1.5 rounded-full border border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-1 w-full">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'content_admin', label: 'Content Admin' },
                                    { id: 'gate_manager', label: 'Gate Manager' },
                                    { id: 'blog_writer', label: 'Blog Writer' },
                                    { id: 'super_admin', label: 'Super Admin' },
                                    { id: 'developer', label: 'Developer' }
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setAdminFilter(filter.id)}
                                        className={cn(
                                            "flex-1 px-4 sm:px-6 py-3.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[70px] sm:min-w-[90px] md:min-w-[110px] flex items-center justify-center text-center leading-none",
                                            adminFilter === filter.id 
                                                ? "bg-neon-green text-black shadow-[0_10px_25px_rgba(57,255,20,0.5)] scale-[1.02]" 
                                                : "text-gray-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-black/40 p-1.5 rounded-full border border-white/10 w-full sm:w-auto justify-center gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "flex-1 sm:flex-none p-3.5 rounded-full transition-all duration-300 flex justify-center items-center",
                                viewMode === 'grid' ? "bg-neon-green text-black shadow-[0_10px_25px_rgba(57,255,20,0.4)]" : "text-gray-500 hover:text-white"
                            )}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "flex-1 sm:flex-none p-3.5 rounded-full transition-all duration-300 flex justify-center items-center",
                                viewMode === 'list' ? "bg-neon-green text-black shadow-[0_10px_25px_rgba(57,255,20,0.4)]" : "text-gray-500 hover:text-white"
                            )}
                        >
                            <FileText size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'members' ? (
                    <motion.div
                        key="members"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {loadingMembers ? (
                            <div className="py-32 text-center text-gray-500 bg-white/[0.01] rounded-[3rem] border border-white/5">
                                <Activity className="animate-spin mx-auto mb-4 text-neon-blue" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest italic">Synchronizing Registry Database...</p>
                            </div>
                        ) : (
                            <>
                                {filteredMembers.length === 0 ? (
                                    <div className="py-24 text-center bg-white/[0.01] border border-white/5 rounded-[2rem]">
                                        <Users size={32} className="mx-auto text-gray-700 mb-4 animate-pulse" />
                                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No matching personnel records found</p>
                                    </div>
                                ) : (
                                    viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {paginatedMembers.map(member => {
                                                const isTribe = member.hasJoinedTribe;
                                                const isCreator = creators?.some(c => c.uid === member.id);
                                                const isArtist = artists?.some(a => a.uid === member.id && a.profileStatus === 'approved');
                                                
                                                return (
                                                    <motion.div
                                                        key={member.id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.98 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="group relative flex flex-col h-full"
                                                    >
                                                        {/* Hover Glow */}
                                                        <div className={cn(
                                                            "absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-10 transition-opacity blur-2xl duration-700 pointer-events-none bg-gradient-to-br",
                                                            member.isBlocked ? "from-red-500/30 to-orange-500/30" : "from-neon-green/30 to-neon-blue/30"
                                                        )} />
                                                        
                                                        <Card className={cn(
                                                            "relative p-6 sm:p-8 bg-zinc-950/60 group-hover:bg-zinc-900/40 hover:border-white/10 border-white/5 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-xl flex flex-col justify-between h-full min-h-[380px] overflow-hidden border hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] gap-6",
                                                            member.isBlocked && "border-red-500/10 hover:border-red-500/30"
                                                        )}>
                                                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent opacity-100 pointer-events-none" />
                                                            
                                                            {/* Card Header section: Role text & active status capsule pill */}
                                                            <div>
                                                                <div className="flex justify-between items-center mb-5">
                                                                    <span className={cn(
                                                                        "px-3 py-1 rounded-full border font-black uppercase tracking-widest text-[8px]",
                                                                        isArtist ? "bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B]" :
                                                                        isCreator ? "bg-neon-pink/10 border-neon-pink/20 text-neon-pink" :
                                                                        isTribe ? "bg-neon-blue/10 border-neon-blue/20 text-neon-blue" :
                                                                        "bg-white/5 border-white/5 text-gray-500"
                                                                    )}>
                                                                        {isArtist ? "Artist" : isCreator ? "Creator" : isTribe ? "Tribe" : "Standard"}
                                                                    </span>
                                                                    
                                                                    {member.isBlocked ? (
                                                                        <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">SUSPENDED</span>
                                                                    ) : (
                                                                        <span className="px-3 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-widest">AUTHORIZED</span>
                                                                    )}
                                                                </div>

                                                                {/* Display Name - Vertically stacked, full card width, no cutoff! */}
                                                                <div className="space-y-1">
                                                                    <h3 className="font-heading font-black text-2xl sm:text-3xl text-white group-hover:text-neon-green transition-colors duration-500 uppercase italic tracking-tighter leading-[0.95] line-clamp-2 pr-4">
                                                                        {member.displayName || 'UNNAMED_SUBJECT'}
                                                                    </h3>
                                                                    <p className="text-[10px] text-gray-500 font-mono select-all leading-relaxed break-all">{member.email}</p>
                                                                </div>
                                                            </div>

                                                            {/* Metadata block nested inside capsule pods */}
                                                            <div className="space-y-2.5 mt-auto">
                                                                <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] bg-white/[0.02] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                                                                    <span className="text-gray-600">REGISTERED:</span>
                                                                    <span className="text-gray-400 font-mono">{member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] bg-white/[0.02] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                                                                    <span className="text-gray-600">LAST ACTIVE:</span>
                                                                    {member.lastActive ? (
                                                                        <span className="text-neon-blue font-mono">{new Date(member.lastActive).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                                                    ) : (
                                                                        <span className="text-gray-700 italic">OFFLINE</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Action buttons styled as premium full width button */}
                                                            <div className="pt-4 border-t border-white/5 w-full mt-auto">
                                                                {member.isBlocked ? (
                                                                    <button 
                                                                        onClick={() => handleUnblockUser(member)} 
                                                                        className="w-full h-12 bg-neon-green text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(57,255,20,0.15)] duration-300"
                                                                    >
                                                                        <CheckCircle size={12} /> Reinstate Clearance
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => handleBlockUser(member)} 
                                                                        className="w-full h-12 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-500 font-black uppercase tracking-widest text-[9px] rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-2 duration-300 active:scale-95"
                                                                    >
                                                                        <ShieldAlert size={12} /> Revoke Clearance
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </Card>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                                            <Card className="min-w-[800px] bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-0 border overflow-hidden">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                                            <th className="p-6 md:p-8">Personnel</th>
                                                            <th className="p-6 md:p-8">Clearance</th>
                                                            <th className="p-6 md:p-8">Affiliation</th>
                                                            <th className="p-6 md:p-8">Registered</th>
                                                            <th className="p-6 md:p-8">Last Active</th>
                                                            <th className="p-6 md:p-8 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {paginatedMembers.map(member => {
                                                            const isTribe = member.hasJoinedTribe;
                                                            const isCreator = creators?.some(c => c.uid === member.id);
                                                            const isArtist = artists?.some(a => a.uid === member.id && a.profileStatus === 'approved');
                                                            
                                                            return (
                                                                <tr key={member.id} className="group hover:bg-white/[0.02] transition-colors">
                                                                    <td className="p-6 md:p-8">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={cn(
                                                                                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black italic tracking-tighter relative border transition-transform duration-500 group-hover:scale-105 shadow-md shrink-0 select-none",
                                                                                member.isBlocked 
                                                                                    ? "bg-red-500/10 border-red-500/20 text-red-500" 
                                                                                    : (isArtist 
                                                                                        ? "bg-[#FF6B6B]/10 border-[#FF6B6B]/30 text-[#FF6B6B]" 
                                                                                        : (isCreator 
                                                                                            ? "bg-neon-pink/10 border-neon-pink/30 text-neon-pink" 
                                                                                            : (isTribe 
                                                                                                ? "bg-neon-blue/10 border-neon-blue/30 text-neon-blue" 
                                                                                                : "bg-white/5 border-white/10 text-white/60")))
                                                                            )}>
                                                                                {member.displayName?.charAt(0).toUpperCase() || 'U'}
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-xs font-black uppercase tracking-tight text-white group-hover:text-neon-green transition-colors">{member.displayName || 'UNNAMED_SUBJECT'}</div>
                                                                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">{member.email}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-6 md:p-8">
                                                                        {member.isBlocked ? (
                                                                            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md text-[7px] font-black uppercase tracking-wider">SUSPENDED</span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-md text-[7px] font-black uppercase tracking-wider">AUTHORIZED</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-6 md:p-8">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {isTribe && (
                                                                                <span className="px-1.5 py-0.5 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-md text-[7px] font-black uppercase tracking-wider">TRIBE</span>
                                                                            )}
                                                                            {isCreator && (
                                                                                <span className="px-1.5 py-0.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded-md text-[7px] font-black uppercase tracking-wider">CREATOR</span>
                                                                            )}
                                                                            {isArtist && (
                                                                                <span className="px-1.5 py-0.5 bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 rounded-md text-[7px] font-black uppercase tracking-wider">ARTIST</span>
                                                                            )}
                                                                            {!isTribe && !isCreator && !isArtist && (
                                                                                <span className="px-1.5 py-0.5 bg-white/5 text-gray-500 border border-white/5 rounded-md text-[7px] font-black uppercase tracking-wider">STANDARD</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-6 md:p-8">
                                                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-6 md:p-8">
                                                                        {member.lastActive ? (
                                                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate" title={`${new Date(member.lastActive).toLocaleDateString()} ${new Date(member.lastActive).toLocaleTimeString()}`}>
                                                                                {new Date(member.lastActive).toLocaleDateString(undefined, { dateStyle: 'short' })}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-gray-700 italic text-[10px]">OFFLINE</div>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-6 md:p-8">
                                                                        <div className="flex justify-end">
                                                                            {member.isBlocked ? (
                                                                                <button 
                                                                                    onClick={() => handleUnblockUser(member)} 
                                                                                    className="px-3 h-8 bg-neon-green/10 hover:bg-neon-green text-neon-green hover:text-black border border-neon-green/20 hover:border-none rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1 shadow-sm"
                                                                                >
                                                                                    <CheckCircle size={10} /> Reinstate
                                                                                </button>
                                                                            ) : (
                                                                                <button 
                                                                                    onClick={() => handleBlockUser(member)} 
                                                                                    className="px-3 h-8 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/10 hover:border-none rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1 shadow-sm"
                                                                                >
                                                                                    <ShieldAlert size={10} /> Suspend
                                                                                </button>
                                                                            )}
                                                                        </div>
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
                            </>
                        )}
                    </motion.div>
                ) : activeTab === 'requests' ? (
                    <motion.div
                        key="requests"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {filteredRequests.length === 0 ? (
                            <div className="py-32 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5 text-center">
                                <Clock size={40} className="mx-auto text-gray-700 mb-4" />
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No pending clearance dispatch queries</p>
                            </div>
                        ) : (
                            viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {paginatedRequests.map((admin) => (
                                        <motion.div
                                            key={admin.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            className="group relative flex flex-col h-full"
                                        >
                                            <div className="absolute inset-0 rounded-[2.5rem] bg-yellow-500/5 opacity-100 blur-xl pointer-events-none duration-500" />
                                            <Card className="relative p-6 sm:p-8 bg-zinc-950/60 group-hover:bg-zinc-900/40 border-yellow-500/10 hover:border-yellow-500/30 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-xl flex flex-col justify-between h-full min-h-[340px] overflow-hidden border hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] gap-6">
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent opacity-100 pointer-events-none" />
                                                
                                                <div>
                                                    <div className="flex justify-between items-center mb-5">
                                                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                            Clearance Query
                                                        </span>
                                                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                            Awaiting Verification
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <h3 className="font-heading font-black text-2xl sm:text-3xl text-white group-hover:text-yellow-500 transition-colors duration-500 uppercase italic tracking-tighter leading-[0.95] line-clamp-2 pr-4 break-all">
                                                            {admin.email}
                                                        </h3>
                                                        <p className="text-[10px] text-gray-500 font-mono">Awaiting credentials dispatch</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2.5 mt-auto">
                                                    <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] bg-white/[0.02] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                                                        <span className="text-gray-600">REQUESTED:</span>
                                                        <span className="text-gray-400 font-mono">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between w-full mt-auto relative z-30">
                                                    <button 
                                                        onClick={() => handleRemoveAdmin(admin.id, admin.role)} 
                                                        className="w-full sm:w-auto px-6 h-12 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-black border border-red-500/10 hover:border-none rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 shrink-0"
                                                    >
                                                        Deny Request
                                                    </button>
                                                    
                                                    <div className="w-full sm:flex-1 relative z-30">
                                                        <StudioSelect
                                                            value=""
                                                            onChange={(val) => handleApprove(admin.id, val)}
                                                            options={getAdminRoleOptions('', canManageDevelopers)}
                                                            placeholder="DISPATCH CLEARANCE"
                                                            accentColor="neon-green"
                                                            className="h-12"
                                                        />
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                                    <Card className="min-w-[800px] bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-0 border overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                                    <th className="p-6 md:p-8">Endpoint / Email</th>
                                                    <th className="p-6 md:p-8">Requested On</th>
                                                    <th className="p-6 md:p-8 text-right">Clearance Level Approval</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {paginatedRequests.map((admin) => (
                                                    <tr key={admin.id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-6 md:p-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center shrink-0">
                                                                    <Clock size={16} className="animate-pulse" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-mono font-bold text-white">{admin.email}</div>
                                                                    <div className="text-[8px] font-black text-yellow-500/70 uppercase tracking-widest mt-0.5">AWAITING CLEARANCE DISPATCH</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 md:p-8">
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                                {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="p-6 md:p-8">
                                                            <div className="flex items-center justify-end gap-4">
                                                                <button 
                                                                    onClick={() => handleRemoveAdmin(admin.id, admin.role)} 
                                                                    className="px-4 h-9 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-black border border-red-500/10 hover:border-none rounded-xl text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1"
                                                                >
                                                                    Deny
                                                                </button>
                                                                
                                                                <div className="w-48 relative">
                                                                    <StudioSelect
                                                                        value=""
                                                                        onChange={(val) => handleApprove(admin.id, val)}
                                                                        options={getAdminRoleOptions('', canManageDevelopers)}
                                                                        placeholder="DISPATCH"
                                                                        accentColor="neon-green"
                                                                        className="h-9"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </Card>
                                </div>
                            )
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="admins"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-12"
                    >
                        {/* Invite / Authorization Panel */}
                        <AnimatePresence>
                            {isInviteOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }} 
                                    exit={{ opacity: 0, height: 0 }} 
                                    className="overflow-hidden"
                                >
                                    <div className="relative group p-0.5 rounded-[2.5rem] bg-gradient-to-r from-neon-green/30 via-neon-blue/20 to-purple-500/30 mb-10">
                                        <div className="absolute inset-0 bg-gradient-to-r from-neon-green/10 via-neon-blue/10 to-purple-500/10 rounded-[2.5rem] blur-xl opacity-50 pointer-events-none" />
                                        <Card className="p-8 sm:p-10 bg-[#0B0F17]/95 border-none rounded-[2.4rem] relative z-10">
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                                                <h2 className="text-base sm:text-lg font-heading font-black italic uppercase tracking-tight flex items-center gap-3 text-white">
                                                    <Shield className="text-neon-green animate-pulse" size={20} /> INITIALIZE CREDENTIALS DISPATCH
                                                </h2>
                                                <button onClick={() => setIsInviteOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                                <div className="md:col-span-6 space-y-2">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Email Endpoint</label>
                                                    <input 
                                                        type="email" 
                                                        value={newAdminEmail} 
                                                        onChange={(e) => setNewAdminEmail(e.target.value)} 
                                                        required 
                                                        placeholder="operative@newbi.live" 
                                                        className="w-full h-14 bg-black/40 hover:bg-black/60 border border-white/5 focus:border-neon-green/30 rounded-2xl px-6 text-xs font-semibold tracking-wider text-white outline-none transition-all placeholder:text-gray-700" 
                                                    />
                                                </div>
                                                <div className="md:col-span-4 space-y-2 relative z-30">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Security Clearance Level</label>
                                                    <StudioSelect
                                                        value={newAdminRole}
                                                        onChange={(val) => setNewAdminRole(val)}
                                                        options={getAdminRoleOptions('', canManageDevelopers)}
                                                        accentColor="neon-green"
                                                        className="h-14"
                                                    />
                                                </div>
                                                <button type="submit" className="md:col-span-2 w-full h-14 bg-neon-green text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:scale-[1.02] active:scale-98 transition-all shadow-[0_10px_20px_rgba(57,255,20,0.15)] flex items-center justify-center gap-2">
                                                    <UserPlus size={14} /> Dispatch
                                                </button>
                                            </form>
                                        </Card>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Inline Pending Invitations Block inside Command Staff tab */}
                        {admins.filter(a => a.role === 'pending').length > 0 && (
                            <section className="space-y-6">
                                <h2 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.35em] flex items-center gap-2 font-heading italic">
                                    <Clock size={14} className="animate-pulse" /> PENDING CREDENTIAL DISPATCHES
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {admins.filter(a => a.role === 'pending').map((admin) => (
                                        <Card key={admin.id} className="p-6 bg-yellow-500/[0.02] border border-yellow-500/20 hover:border-yellow-500/40 rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 backdrop-blur-md relative z-30">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-mono text-sm font-bold text-white truncate break-all">{admin.email}</h3>
                                                <p className="text-[8px] font-black text-yellow-500/50 uppercase tracking-widest mt-1 italic">Waiting for verification</p>
                                            </div>
                                            <div className="flex gap-3 shrink-0 items-center w-full sm:w-auto justify-between sm:justify-end">
                                                <button 
                                                    onClick={() => handleRemoveAdmin(admin.id, admin.role)} 
                                                    className="px-4 h-10 rounded-xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-black transition-all duration-300"
                                                >
                                                    Deny
                                                </button>
                                                <div className="w-44 relative">
                                                    <StudioSelect
                                                        value=""
                                                        onChange={(val) => handleApprove(admin.id, val)}
                                                        options={getAdminRoleOptions('', canManageDevelopers)}
                                                        placeholder="DISPATCH"
                                                        accentColor="neon-green"
                                                        className="h-10"
                                                    />
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Active Command Staff Clearance Registry */}
                        <section className="space-y-6">
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.35em] flex items-center gap-2 font-heading italic pb-2 border-b border-white/5">
                                <Shield size={14} className="text-neon-green" /> ACTIVE OPERATIONS CLEARANCE REGISTRY
                            </h2>
                            {filteredAdmins.length === 0 ? (
                                <div className="py-24 text-center bg-white/[0.01] border border-white/5 rounded-[2rem]">
                                    <Users size={32} className="mx-auto text-gray-700 mb-4 animate-pulse" />
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No matching active command staff found</p>
                                </div>
                            ) : (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {paginatedAdmins.map((admin) => {
                                            const isSelf = admin.email === user.email;
                                            const roleColors = {
                                                developer: { text: 'text-white', border: 'border-white/20', bg: 'bg-white/5', name: 'Developer', glow: 'from-white/30 to-zinc-500/30' },
                                                super_admin: { text: 'text-neon-pink', border: 'border-neon-pink/20', bg: 'bg-neon-pink/5', name: 'Super Admin', glow: 'from-neon-pink/30 to-purple-500/30' },
                                                content_admin: { text: 'text-neon-green', border: 'border-neon-green/20', bg: 'bg-neon-green/5', name: 'Content Admin', glow: 'from-neon-green/30 to-teal-500/30' },
                                                gate_manager: { text: 'text-yellow-500', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', name: 'Gate Manager', glow: 'from-yellow-500/30 to-orange-500/30' },
                                                blog_writer: { text: 'text-neon-blue', border: 'border-neon-blue/20', bg: 'bg-neon-blue/5', name: 'Blog Writer', glow: 'from-neon-blue/30 to-indigo-500/30' },
                                                editor: { text: 'text-neon-green', border: 'border-neon-green/20', bg: 'bg-neon-green/5', name: 'Content Admin', glow: 'from-neon-green/30 to-teal-500/30' },
                                                scanner: { text: 'text-yellow-500', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', name: 'Gate Manager', glow: 'from-yellow-500/30 to-orange-500/30' },
                                            };
                                            
                                            const roleStyle = roleColors[admin.role] || { text: 'text-gray-400', border: 'border-white/5', bg: 'bg-white/5', name: admin.role, glow: 'from-white/5 to-white/5' };

                                            return (
                                                <motion.div
                                                    key={admin.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="group relative flex flex-col h-full"
                                                >
                                                    <div className={cn(
                                                        "absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-10 transition-opacity blur-2xl duration-700 pointer-events-none bg-gradient-to-br",
                                                        roleStyle.glow
                                                    )} />
                                                    <Card className="relative p-6 sm:p-8 bg-zinc-950/60 group-hover:bg-zinc-900/40 hover:border-white/10 border-white/5 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-xl flex flex-col justify-between h-full min-h-[380px] overflow-hidden border hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] gap-6">
                                                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent opacity-100 pointer-events-none" />
                                                        
                                                        <div>
                                                            <div className="flex justify-between items-center mb-5">
                                                                <span className={cn(
                                                                    "px-3 py-1 rounded-full border font-black uppercase tracking-widest text-[8px]",
                                                                    roleStyle.bg, roleStyle.border, roleStyle.text
                                                                )}>
                                                                    {roleStyle.name}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {isSelf && (
                                                                        <span className="px-2 py-0.5 bg-white text-black rounded-md text-[8px] font-black uppercase tracking-widest">
                                                                            Self
                                                                        </span>
                                                                    )}
                                                                    <span className="px-3 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                                        OPERATIVE
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <h3 className="font-heading font-black text-2xl sm:text-3xl text-white group-hover:text-neon-green transition-colors duration-500 uppercase italic tracking-tighter leading-[0.95] line-clamp-2 pr-4 break-all">
                                                                    {admin.displayName || 'UNIDENTIFIED_OPERATIVE'}
                                                                </h3>
                                                                <p className="text-[10px] text-gray-500 font-mono select-all leading-relaxed break-all">{admin.email}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-2 relative z-30">
                                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none">RANK / CLEARANCE</p>
                                                            {canManageDevelopers ? (
                                                                <StudioSelect
                                                                    value={admin.role}
                                                                    onChange={(val) => handleUpdateRole(admin.id, val)}
                                                                    options={getAdminRoleOptions(admin.role, canManageDevelopers)}
                                                                    disabled={isSelf}
                                                                    accentColor={getSelectAccentColor(admin.role)}
                                                                    className="h-12"
                                                                />
                                                            ) : (
                                                                <span className={cn(
                                                                    "px-3 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border inline-flex items-center justify-center w-full",
                                                                    roleStyle.bg, roleStyle.border, roleStyle.text
                                                                )}>
                                                                    {roleStyle.name}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2.5 mt-auto">
                                                            <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] bg-white/[0.02] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                                                                <span className="text-gray-600">DISPATCHED:</span>
                                                                <span className="text-gray-400 font-mono">
                                                                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2 w-full mt-auto">
                                                            {(isSelf || user.role === 'developer') && (
                                                                <button 
                                                                    onClick={() => {
                                                                        const newName = prompt(`Modify identity for ${admin.email}:`, admin.displayName || "");
                                                                        if (newName !== null && newName.trim() !== "") {
                                                                            useStore.getState().updateAdminProfile(null, admin.email, { displayName: newName }).then(() => fetchAdmins());
                                                                        }
                                                                    }} 
                                                                    className="flex-1 h-11 bg-white/5 hover:bg-neon-blue/15 text-gray-500 hover:text-neon-blue border border-white/5 hover:border-neon-blue/20 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95 duration-300" 
                                                                    title="Modify Identity"
                                                                >
                                                                    <UserCheck size={12} /> Rename
                                                                </button>
                                                            )}
                                                            {(!isSelf && canEditRoles(admin.role)) && (
                                                                <>
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (window.confirm(`Reset credentials for ${admin.email}?`)) {
                                                                                await useStore.getState().resetPassword(admin.email);
                                                                                useStore.getState().addToast("Password reset email sent!", 'success');
                                                                            }
                                                                        }} 
                                                                        className="flex-1 h-11 bg-white/5 hover:bg-neon-pink/15 text-gray-500 hover:text-neon-pink border border-white/5 hover:border-neon-pink/20 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95 duration-300" 
                                                                        title="Reset Credentials"
                                                                    >
                                                                        <Shield size={12} /> Reset
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleRemoveAdmin(admin.id, admin.role)} 
                                                                        className="flex-1 h-11 bg-white/5 hover:bg-red-500/15 text-gray-500 hover:text-red-500 border border-white/5 hover:border-red-500/20 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95 duration-300" 
                                                                        title="Terminate Access"
                                                                    >
                                                                        <Trash2 size={12} /> Terminate
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                                        <Card className="min-w-[800px] bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-0 border overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                                        <th className="p-6 md:p-8">Operative</th>
                                                        <th className="p-6 md:p-8">Clearance / Rank</th>
                                                        <th className="p-6 md:p-8">Dispatched On</th>
                                                        <th className="p-6 md:p-8 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {paginatedAdmins.map((admin) => {
                                                        const isSelf = admin.email === user.email;
                                                        const roleColors = {
                                                            developer: { text: 'text-white', border: 'border-white/20', bg: 'bg-white/5', name: 'Developer' },
                                                            super_admin: { text: 'text-neon-pink', border: 'border-neon-pink/20', bg: 'bg-neon-pink/5', name: 'Super Admin' },
                                                            content_admin: { text: 'text-neon-green', border: 'border-neon-green/20', bg: 'bg-neon-green/5', name: 'Content Admin' },
                                                            gate_manager: { text: 'text-yellow-500', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', name: 'Gate Manager' },
                                                            blog_writer: { text: 'text-neon-blue', border: 'border-neon-blue/20', bg: 'bg-neon-blue/5', name: 'Blog Writer' },
                                                            editor: { text: 'text-neon-green', border: 'border-neon-green/20', bg: 'bg-neon-green/5', name: 'Content Admin' },
                                                            scanner: { text: 'text-yellow-500', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', name: 'Gate Manager' },
                                                        };
                                                        
                                                        const roleStyle = roleColors[admin.role] || { text: 'text-gray-400', border: 'border-white/5', bg: 'bg-white/5', name: admin.role };

                                                        return (
                                                            <tr key={admin.id} className="group hover:bg-white/[0.02] transition-colors">
                                                                <td className="p-6 md:p-8">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={cn(
                                                                            "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black italic tracking-tighter relative border transition-transform duration-500 group-hover:scale-105 shadow-md shrink-0 select-none",
                                                                            roleStyle.bg, roleStyle.border, roleStyle.text
                                                                        )}>
                                                                            {admin.displayName?.charAt(0).toUpperCase() || admin.email.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="text-xs font-black uppercase tracking-tight text-white">{admin.displayName || 'UNIDENTIFIED_OPERATIVE'}</div>
                                                                                {isSelf && <span className="bg-white text-black px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase leading-none select-none">Self</span>}
                                                                            </div>
                                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{admin.email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-6 md:p-8">
                                                                    {canManageDevelopers ? (
                                                                        <div className="relative w-44 z-30">
                                                                            <StudioSelect
                                                                                value={admin.role}
                                                                                onChange={(val) => handleUpdateRole(admin.id, val)}
                                                                                options={getAdminRoleOptions(admin.role, canManageDevelopers)}
                                                                                disabled={isSelf}
                                                                                accentColor={getSelectAccentColor(admin.role)}
                                                                                className="h-10"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <span className={cn(
                                                                            "px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border inline-flex items-center justify-center",
                                                                            roleStyle.bg, roleStyle.border, roleStyle.text
                                                                        )}>
                                                                            {roleStyle.name}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-6 md:p-8">
                                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                                                    </div>
                                                                </td>
                                                                <td className="p-6 md:p-8">
                                                                    <div className="flex justify-end gap-2">
                                                                        {(isSelf || user.role === 'developer') && (
                                                                            <button 
                                                                                onClick={() => {
                                                                                    const newName = prompt(`Modify identity for ${admin.email}:`, admin.displayName || "");
                                                                                    if (newName !== null && newName.trim() !== "") {
                                                                                        useStore.getState().updateAdminProfile(null, admin.email, { displayName: newName }).then(() => fetchAdmins());
                                                                                    }
                                                                                }} 
                                                                                className="h-8 px-3 bg-white/5 hover:bg-neon-blue/15 text-gray-500 hover:text-neon-blue border border-white/5 hover:border-neon-blue/20 rounded-lg transition-all flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest shadow-sm" 
                                                                            >
                                                                                <UserCheck size={10} /> Rename
                                                                            </button>
                                                                        )}
                                                                        {(!isSelf && canEditRoles(admin.role)) && (
                                                                            <>
                                                                                <button 
                                                                                    onClick={async () => {
                                                                                        if (window.confirm(`Reset credentials for ${admin.email}?`)) {
                                                                                            await useStore.getState().resetPassword(admin.email);
                                                                                            useStore.getState().addToast("Password reset email sent!", 'success');
                                                                                        }
                                                                                    }} 
                                                                                    className="h-8 px-3 bg-white/5 hover:bg-neon-pink/15 text-gray-500 hover:text-neon-pink border border-white/5 hover:border-neon-pink/20 rounded-lg transition-all flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest shadow-sm" 
                                                                                >
                                                                                    <Shield size={10} /> Reset
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => handleRemoveAdmin(admin.id, admin.role)} 
                                                                                    className="h-8 px-3 bg-white/5 hover:bg-red-500/15 text-gray-500 hover:text-red-500 border border-white/5 hover:border-red-500/20 rounded-lg transition-all flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest shadow-sm" 
                                                                                >
                                                                                    <Trash2 size={10} /> Terminate
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
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
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-16 pb-12">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        {getPageNumbers(currentPage, totalPages).map((page, i) => {
                            if (page === '...') {
                                return (
                                    <span 
                                        key={`dots-${i}`} 
                                        className="w-12 h-12 flex items-center justify-center text-gray-500 font-black text-sm select-none"
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
                                        "w-12 h-12 rounded-full font-black text-xs transition-all border flex items-center justify-center",
                                        currentPage === page 
                                            ? "bg-neon-green text-black border-neon-green shadow-[0_0_20px_rgba(57,255,20,0.3)]" 
                                            : "bg-white/5 text-gray-500 border-white/10 hover:border-white/30"
                                    )}
                                >
                                    {page}
                                </button>
                            );
                        })}
                    </div>
                    <button 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </AdminCommunityHubLayout>
    );
};

export default AdminManager;
