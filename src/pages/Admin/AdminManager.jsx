import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    LayoutGrid, UserPlus, Trash2, Shield, Clock, CheckCircle,
    Users, Search, ShieldAlert, UserCheck, X, LogOut,
    FileText, ChevronLeft, ChevronRight, RefreshCw, Zap,
    Sparkles, Star, Ticket, Activity, Edit3, KeyRound
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import { useStore } from '../../lib/store';
import { useConsolidatedMembers } from '../../hooks/useConsolidatedMembers';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import StudioSelect from '../../components/ui/StudioSelect';
import GlobalLoader from '../../components/ui/GlobalLoader';
import { sendStaffAuthorizedEmail } from '../../lib/email';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getAdminRoleOptions = (currentRole, canManageDevelopers, canManageFounders) => {
    const opts = [
        { value: 'content_admin', label: 'Content Admin' },
        { value: 'gate_manager', label: 'Ticketing Admin' },
        { value: 'blog_writer', label: 'Blog Writer' },
        { value: 'super_admin', label: 'Super Admin' }
    ];
    if (canManageFounders) opts.push({ value: 'founder', label: 'Founder' });
    if (canManageDevelopers) opts.push({ value: 'developer', label: 'Developer' });
    if (currentRole === 'editor' && !opts.some(o => o.value === 'editor'))
        opts.push({ value: 'editor', label: 'Content Admin (Legacy)' });
    if (currentRole === 'scanner' && !opts.some(o => o.value === 'scanner'))
        opts.push({ value: 'scanner', label: 'Ticketing Admin (Legacy)' });
    return opts;
};

const getRoleBadgeStyle = (role) => {
    switch (role) {
        case 'developer':
            return { label: 'Developer', bg: 'bg-white/10', border: 'border-white/20', text: 'text-white', bar: 'from-gray-200 to-zinc-400' };
        case 'founder':
            return { label: 'Founder', bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/30', text: 'text-[#FFD700]', bar: 'from-[#FFD700] to-amber-500' };
        case 'super_admin':
            return { label: 'Super Admin', bg: 'bg-neon-pink/10', border: 'border-neon-pink/30', text: 'text-neon-pink', bar: 'from-neon-pink to-purple-500' };
        case 'content_admin':
        case 'editor':
            return { label: 'Content Admin', bg: 'bg-neon-green/10', border: 'border-neon-green/30', text: 'text-neon-green', bar: 'from-neon-green to-emerald-500' };
        case 'gate_manager':
        case 'scanner':
            return { label: 'Ticketing Admin', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: 'from-yellow-400 to-amber-500' };
        case 'blog_writer':
            return { label: 'Blog Writer', bg: 'bg-neon-blue/10', border: 'border-neon-blue/30', text: 'text-neon-blue', bar: 'from-neon-blue to-indigo-500' };
        default:
            return { label: role || 'Staff', bg: 'bg-black/5 dark:bg-white/5', border: 'border-black/10 dark:border-white/10', text: 'text-gray-400', bar: 'from-gray-500 to-zinc-700' };
    }
};

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

// ─── Member Card Component ─────────────────────────────────────────────────────

const MemberCard = ({ member, creators, artists, onBlock, onUnblock, onRevokeSessions }) => {
    const isTribe = member.hasJoinedTribe;
    const isCreator = member.isCreator || creators?.some(c => c.uid === member.id || c.email === member.email);
    const isArtist = member.isArtist || artists?.some(a => (a.uid === member.id || a.email === member.email) && a.profileStatus === 'approved');
    const isTicketHolder = member.isTicketHolder;
    const isSubscriber = member.isSubscriber;
    const isAdmin = member.isAdmin || (member.role && member.role !== 'Member' && member.role !== 'member');

    const typeLabel = isArtist ? 'Artist' : isCreator ? 'Creator' : isAdmin ? (member.role || 'Admin') : isTribe ? 'Tribe' : isTicketHolder ? 'Ticket Holder' : isSubscriber ? 'Subscriber' : 'Member';
    
    const typeStyle = isArtist ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B]'
        : isCreator ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink'
        : isAdmin ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
        : isTribe ? 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue'
        : isTicketHolder ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
        : isSubscriber ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/5 text-gray-500';

    const avatarStyle = member.isBlocked
        ? 'bg-red-500/10 border-red-500/20 text-red-500'
        : isArtist ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/30 text-[#FF6B6B]'
        : isCreator ? 'bg-neon-pink/10 border-neon-pink/30 text-neon-pink'
        : isAdmin ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
        : isTribe ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue'
        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-700 dark:text-white/60';

    const barStyle = member.isBlocked
        ? 'from-red-500/70 to-orange-500/50'
        : isArtist ? 'from-[#FF6B6B]/70 to-pink-500/40'
        : isCreator ? 'from-neon-pink/70 to-purple-500/40'
        : isAdmin ? 'from-purple-500/70 to-indigo-500/40'
        : isTribe ? 'from-neon-blue/70 to-indigo-500/40'
        : 'from-neon-green/60 to-transparent';

    return (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group relative flex flex-col h-full">
            <div className={cn(
                "absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-15 transition-opacity blur-2xl duration-700 pointer-events-none bg-gradient-to-br",
                member.isBlocked ? "from-red-500 to-orange-500" : "from-neon-green to-neon-blue"
            )} />
            <Card className={cn(
                "relative p-6 sm:p-7 bg-gray-100 dark:bg-zinc-950/60 group-hover:bg-gray-50 dark:group-hover:bg-zinc-900/50 border-black/10 dark:border-white/5 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-md hover:shadow-xl flex flex-col h-full min-h-[350px] overflow-hidden border hover:-translate-y-1 gap-4",
                member.isBlocked && "border-red-500/20 hover:border-red-500/30"
            )}>
                <div className={cn("absolute top-0 left-0 w-full h-[2.5px] rounded-t-[2.5rem] bg-gradient-to-r", barStyle)} />

                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black italic border shrink-0 shadow-sm select-none", avatarStyle)}>
                            {(member.displayName || member.email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <span className={cn("px-2.5 py-1 rounded-full border font-black uppercase tracking-widest text-[8px]", typeStyle)}>
                            {typeLabel}
                        </span>
                    </div>
                    {member.isBlocked ? (
                        <span className="px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            SUSPENDED
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                            ACTIVE
                        </span>
                    )}
                </div>

                {/* Name + Email */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-black text-xl sm:text-2xl text-gray-900 dark:text-white group-hover:text-neon-green transition-colors duration-300 uppercase italic tracking-tighter leading-tight line-clamp-2">
                        {member.displayName || 'UNNAMED MEMBER'}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-1 break-all leading-relaxed select-all">{member.email || '—'}</p>
                    {member.phone && <p className="text-[10px] text-gray-600 dark:text-gray-400 font-mono mt-0.5">{member.phone}</p>}
                </div>

                {/* Meta Pills */}
                <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1.5 text-[9px] text-gray-500 font-black uppercase tracking-wide bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 px-3 py-1.5 rounded-xl">
                        <span className="text-gray-400">JOINED</span>
                        <span className="text-gray-700 dark:text-gray-300 font-mono">
                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                        </span>
                    </span>
                    {member.lastActive && (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide bg-neon-blue/5 border border-neon-blue/15 px-3 py-1.5 rounded-xl text-neon-blue">
                            <span className="text-neon-blue/50">SEEN</span>
                            <span className="font-mono">{new Date(member.lastActive).toLocaleDateString(undefined, { dateStyle: 'short' })}</span>
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-black/10 dark:border-white/5 flex flex-col gap-2 mt-auto">
                    {member.isBlocked ? (
                        <button
                            onClick={() => onUnblock(member)}
                            className="w-full h-11 bg-neon-green text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(57,255,20,0.2)]"
                        >
                            <CheckCircle size={13} /> Reinstate Access
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => onBlock(member)}
                                className="w-full h-11 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-black uppercase tracking-widest text-[9px] rounded-xl border border-red-500/20 hover:border-transparent transition-all flex items-center justify-center gap-2 duration-300 active:scale-95"
                            >
                                <ShieldAlert size={13} /> Suspend Clearance
                            </button>
                            <button
                                onClick={() => onRevokeSessions(member)}
                                className="w-full h-10 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 font-black uppercase tracking-widest text-[9px] rounded-xl border border-black/10 dark:border-white/5 hover:border-red-500/20 transition-all flex items-center justify-center gap-2 duration-200 active:scale-95"
                            >
                                <LogOut size={12} /> Log Out All Devices
                            </button>
                        </>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};

// ─── Main AdminManager Component ───────────────────────────────────────────────

const AdminManager = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        user,
        blockUser,
        unblockUser,
        authInitialized,
        admins: storeAdmins = []
    } = useStore();

    // Use consolidated members as the high-integrity, real-time registry
    const {
        members,
        activeMembers,
        suspendedMembers,
        totalCount,
        activeCount,
        suspendedCount,
        creators = [],
        artists = []
    } = useConsolidatedMembers();

    // Tab state from URL query param or default to 'members'
    const initialTab = searchParams.get('tab') || 'members';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Sync tab changes with URL search params
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
        setMemberSearch('');
        setAdminSearch('');
        setCurrentPage(1);
    };

    // ── Admin management state ──
    const [localAdmins, setLocalAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminRole, setNewAdminRole] = useState('content_admin');
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [adminSearch, setAdminSearch] = useState('');
    const [adminFilter, setAdminFilter] = useState('all');

    // ── Members roster search & filters ──
    const [memberSearch, setMemberSearch] = useState('');
    const [memberFilter, setMemberFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 24;

    // ── Sync & Refresh state ──
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch admins directly from Firestore collection
    const fetchAdmins = useCallback(async () => {
        setLoadingAdmins(true);
        try {
            const snapshot = await getDocs(collection(db, 'admins'));
            setLocalAdmins(snapshot.docs.map(d => ({ ...d.data(), id: d.id, uid: d.id })));
        } catch (err) {
            console.error('Error fetching admins:', err);
        } finally {
            setLoadingAdmins(false);
        }
    }, []);

    useEffect(() => {
        if (user?.uid) {
            fetchAdmins();
        }
    }, [user?.uid, fetchAdmins]);

    const admins = useMemo(() => {
        const source = (storeAdmins && storeAdmins.length > 0) ? storeAdmins : localAdmins;
        return (source || []).map(a => ({ ...a, id: a.id || a.uid, uid: a.uid || a.id }));
    }, [storeAdmins, localAdmins]);

    const pendingRequests = useMemo(() => admins.filter(a => a.role === 'pending'), [admins]);

    // Derived permissions
    const canAuthorizeStaff = user?.role === 'developer' || user?.role === 'founder';
    const canManageDevelopers = user?.role === 'developer' || user?.role === 'founder';
    const canManageFounders = user?.role === 'developer' || user?.role === 'founder';
    const canEditRoles = user?.role === 'developer' || user?.role === 'founder';

    const displayAdmins = useMemo(() => {
        if (user?.role === 'developer' || user?.role === 'founder') return admins;
        if (user?.role === 'super_admin') return admins.filter(a => a.role !== 'developer');
        return admins.filter(a => a.role !== 'developer' && a.role !== 'founder');
    }, [admins, user?.role]);

    // ── Filtered Members Calculation across the entire registry ──
    const filteredMembers = useMemo(() => {
        let baseList = members;

        // If on Active Users tab, enforce active only
        if (activeTab === 'active') {
            baseList = activeMembers;
        } else if (memberFilter === 'active') {
            baseList = activeMembers;
        } else if (memberFilter === 'suspended') {
            baseList = suspendedMembers;
        }

        const searchLower = memberSearch.trim().toLowerCase();

        return baseList.filter(m => {
            if (searchLower) {
                const matches = (
                    (m.email || '').toLowerCase().includes(searchLower) ||
                    (m.displayName || '').toLowerCase().includes(searchLower) ||
                    (m.phone || '').toLowerCase().includes(searchLower) ||
                    (m.role || '').toLowerCase().includes(searchLower) ||
                    (m.id || '').toLowerCase().includes(searchLower)
                );
                if (!matches) return false;
            }

            if (memberFilter === 'tribe') return m.hasJoinedTribe;
            if (memberFilter === 'creators') return m.isCreator || creators.some(c => c.uid === m.id || c.email === m.email);
            if (memberFilter === 'artists') return m.isArtist || artists.some(a => (a.uid === m.id || a.email === m.email) && a.profileStatus === 'approved');
            if (memberFilter === 'tickets') return m.isTicketHolder;
            if (memberFilter === 'subscribers') return m.isSubscriber;
            if (memberFilter === 'admins') return m.isAdmin || admins.some(a => a.email === m.email);

            return true;
        });
    }, [members, activeMembers, suspendedMembers, activeTab, memberFilter, memberSearch, creators, artists, admins]);

    // Reset pagination on search or filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [memberSearch, memberFilter, activeTab]);

    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
    const paginatedMembers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMembers.slice(start, start + itemsPerPage);
    }, [filteredMembers, currentPage, itemsPerPage]);

    // ── Filtered Admins Calculation ──
    const filteredAdmins = useMemo(() => {
        const searchLower = adminSearch.trim().toLowerCase();
        return displayAdmins.filter(a => {
            if (a.role === 'pending') return false;
            if (searchLower) {
                const matches = (
                    (a.email || '').toLowerCase().includes(searchLower) ||
                    (a.displayName || '').toLowerCase().includes(searchLower) ||
                    (a.role || '').toLowerCase().includes(searchLower)
                );
                if (!matches) return false;
            }
            if (adminFilter !== 'all') {
                if (adminFilter === 'content_admin') return a.role === 'content_admin' || a.role === 'editor';
                if (adminFilter === 'gate_manager') return a.role === 'gate_manager' || a.role === 'scanner';
                return a.role === adminFilter;
            }
            return true;
        });
    }, [displayAdmins, adminSearch, adminFilter]);

    const filteredRequests = useMemo(() => {
        const searchLower = adminSearch.trim().toLowerCase();
        return pendingRequests.filter(a => (a.email || '').toLowerCase().includes(searchLower));
    }, [pendingRequests, adminSearch]);

    // ── Action Handlers ──

    const handleSyncAuthUsers = async () => {
        if (!window.confirm("Synchronize all registered user accounts from Firebase Authentication into the Firestore member database?")) return;
        setIsSyncing(true);
        try {
            const result = await useStore.getState().syncAuthUsers();
            useStore.getState().addToast(result.message || `Successfully synced ${result.syncedCount} members!`, 'success');
            await fetchAdmins();
        } catch (error) {
            console.error("Sync error:", error);
            useStore.getState().addToast(error.message || "Failed to synchronize users.", 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchAdmins();
            useStore.getState().addToast('Member registry updated!', 'success');
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleBlockUser = async (member) => {
        if (window.confirm(`Suspend clearance for ${member.email || member.displayName}? They will lose account access immediately.`)) {
            try {
                await blockUser(member.id);
                useStore.getState().addToast(`Suspended ${member.displayName || member.email}.`, 'success');
            } catch (error) {
                console.error('Suspend error:', error);
                useStore.getState().addToast("Something went wrong. Please try again.", 'error');
            }
        }
    };

    const handleUnblockUser = async (member) => {
        try {
            await unblockUser(member.id);
            useStore.getState().addToast(`Reinstated clearance for ${member.displayName || member.email}.`, 'success');
        } catch (error) {
            console.error('Reinstate error:', error);
            useStore.getState().addToast("Something went wrong. Please try again.", 'error');
        }
    };

    const handleRevokeMemberSessions = async (member) => {
        if (window.confirm(`Log ${member.displayName || member.email} out of all active devices?`)) {
            try {
                await useStore.getState().revokeSessions(member.id, member.email);
                useStore.getState().addToast(`Successfully revoked sessions for ${member.displayName || member.email}.`, 'success');
            } catch (error) {
                useStore.getState().addToast(error.message || "Failed to revoke sessions", 'error');
            }
        }
    };

    const handleRevokeAdminSessions = async (admin) => {
        if (window.confirm(`Log operative ${admin.displayName || admin.email} out of all active devices?`)) {
            try {
                await useStore.getState().revokeSessions(admin.uid || null, admin.email);
                useStore.getState().addToast(`Successfully revoked sessions for ${admin.displayName || admin.email}.`, 'success');
            } catch (error) {
                useStore.getState().addToast(error.message || "Failed to revoke sessions", 'error');
            }
        }
    };

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!canAuthorizeStaff) {
            useStore.getState().addToast("You don't have permission to add new admins.", 'error');
            return;
        }
        try {
            const q = query(collection(db, 'admins'), where('email', '==', newAdminEmail.trim()));
            const existing = await getDocs(q);
            if (!existing.empty) {
                useStore.getState().addToast('This account is already registered as an admin.', 'error');
                return;
            }
            await addDoc(collection(db, 'admins'), {
                email: newAdminEmail.trim().toLowerCase(),
                role: newAdminRole,
                addedBy: user.email,
                createdAt: new Date().toISOString()
            });
            const emailSentTo = newAdminEmail.trim().toLowerCase();
            const roleAssigned = newAdminRole;
            setNewAdminEmail('');
            setIsInviteOpen(false);
            await fetchAdmins();
            useStore.getState().addToast("Admin credentials dispatched successfully!", 'success');
            sendStaffAuthorizedEmail(emailSentTo, roleAssigned).catch(err => console.error('Failed to send authorization email:', err));
        } catch (err) {
            console.error('Failed to add admin:', err);
            useStore.getState().addToast("Couldn't add admin. Please try again.", 'error');
        }
    };

    const handleApprove = async (id, role) => {
        if (!canAuthorizeStaff) {
            useStore.getState().addToast("You don't have permission to approve admin requests.", 'error');
            return;
        }
        try {
            const adminDoc = admins.find(a => a.id === id);
            await updateDoc(doc(db, 'admins', id), { role });
            await fetchAdmins();
            useStore.getState().addToast(`Clearance approved and role assigned: ${role}.`, 'success');
            if (adminDoc?.email) sendStaffAuthorizedEmail(adminDoc.email, role).catch(err => console.error('Failed to send authorization email:', err));
        } catch (err) {
            console.error('Failed to approve request:', err);
            useStore.getState().addToast("Couldn't approve request. Please try again.", 'error');
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        if (!canEditRoles) {
            useStore.getState().addToast("You don't have permission to change this operative's role.", 'error');
            return;
        }
        try {
            await updateDoc(doc(db, 'admins', id), { role: newRole });
            await fetchAdmins();
            useStore.getState().addToast(`Clearance level updated to ${newRole}.`, 'success');
        } catch (err) {
            console.error('Failed to update role:', err);
            useStore.getState().addToast("Couldn't update role. Please try again.", 'error');
        }
    };

    const handleRemoveAdmin = async (id, targetRole) => {
        if (!canEditRoles) {
            useStore.getState().addToast("You don't have permission to remove admins.", 'error');
            return;
        }
        if (window.confirm('Revoke all admin clearances for this account? They will lose dashboard access immediately.')) {
            try {
                await deleteDoc(doc(db, 'admins', id));
                await fetchAdmins();
                useStore.getState().addToast("Admin clearance revoked.", 'success');
            } catch (err) {
                console.error('Failed to remove admin:', err);
                useStore.getState().addToast("Couldn't remove admin. Please try again.", 'error');
            }
        }
    };

    // ── Access Guard ──
    if (!authInitialized) return <GlobalLoader />;

    if (user?.role !== 'super_admin' && user?.role !== 'developer' && user?.role !== 'founder' && user?.role !== 'content_admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#020202]">
                <div className="text-center p-12 bg-white dark:bg-zinc-900/40 backdrop-blur-3xl border border-gray-200 dark:border-white/5 rounded-[3rem] max-w-md mx-auto shadow-xl">
                    <ShieldAlert size={48} className="mx-auto mb-6 text-red-500" />
                    <h1 className="text-3xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-black dark:to-white">ACCESS DENIED</h1>
                    <p className="text-gray-500 mt-4 text-sm font-medium">You don't have permission to view the Members & Access Command.</p>
                    <Link to="/admin" className="text-neon-blue mt-8 inline-block font-black uppercase text-[10px] tracking-widest hover:underline">Return to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'Members & Access',
                subtitle: 'Command Center',
                icon: Shield,
                accentClass: 'text-neon-green'
            }}
            accentColor="neon-green"
            hideTabs={true}
            action={
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10 disabled:opacity-50"
                        title="Reload latest records"
                    >
                        <RefreshCw size={13} className={cn("text-neon-blue", isRefreshing && "animate-spin")} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>

                    <button
                        onClick={handleSyncAuthUsers}
                        disabled={isSyncing}
                        className={cn(
                            "flex-1 sm:flex-initial flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all duration-300",
                            isSyncing
                                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30 cursor-wait opacity-80"
                                : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-black/10 dark:border-white/10 hover:border-neon-blue/40"
                        )}
                        title="Synchronize Firebase Auth into Firestore"
                    >
                        <Zap size={13} className={cn("text-neon-blue", isSyncing && "animate-pulse")} />
                        {isSyncing ? 'Syncing...' : 'Sync Auth Members'}
                    </button>

                    {canAuthorizeStaff && (
                        <button
                            onClick={() => {
                                setActiveTab('admins');
                                setIsInviteOpen(!isInviteOpen);
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-neon-green text-black font-black uppercase text-[9px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_4px_15px_rgba(57,255,20,0.2)]"
                        >
                            <UserPlus size={13} />
                            Dispatch Credential
                        </button>
                    )}
                </div>
            }
        >
            {/* ── DASHBOARD-STYLE METRICS WIDGETS ──────────────────────────────── */}
            <div className="relative mb-10 md:mb-14">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                        {
                            label: 'Total Registered',
                            value: totalCount.toLocaleString(),
                            icon: Users,
                            color: 'neon-blue',
                            detail: 'All platform registered accounts',
                            onClick: () => { handleTabChange('members'); setMemberFilter('all'); },
                            isActive: activeTab === 'members' && memberFilter === 'all'
                        },
                        {
                            label: 'Active Users',
                            value: activeCount.toLocaleString(),
                            icon: UserCheck,
                            color: 'neon-green',
                            detail: `${totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100}% Active Clearance Rate`,
                            onClick: () => { handleTabChange('active'); setMemberFilter('all'); },
                            isActive: activeTab === 'active'
                        },
                        {
                            label: 'Administrators',
                            value: admins.filter(a => a.role !== 'pending').length,
                            icon: Shield,
                            color: 'neon-pink',
                            detail: `${pendingRequests.length} Pending Clearance Requests`,
                            onClick: () => { handleTabChange('admins'); },
                            isActive: activeTab === 'admins'
                        },
                        {
                            label: 'Suspended Access',
                            value: suspendedCount,
                            icon: ShieldAlert,
                            color: 'neon-purple',
                            detail: suspendedCount > 0 ? `${suspendedCount} Restricted Accounts` : 'Zero Restricted Accounts',
                            onClick: () => { handleTabChange('members'); setMemberFilter('suspended'); },
                            isActive: activeTab === 'members' && memberFilter === 'suspended'
                        }
                    ].map((stat, i) => {
                        const hoverBorder = stat.color === 'neon-green' ? 'hover:border-emerald-500/50 dark:hover:border-neon-green/30' :
                                            (stat.color === 'neon-blue' ? 'hover:border-sky-500/50 dark:hover:border-neon-blue/30' :
                                            (stat.color === 'neon-pink' ? 'hover:border-rose-500/50 dark:hover:border-neon-pink/30' : 'hover:border-purple-500/50 dark:hover:border-neon-purple/30'));

                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                onClick={stat.onClick}
                                className="group relative w-full flex flex-col items-stretch cursor-pointer select-none"
                            >
                                <div className={cn("absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-15 transition-opacity blur-xl bg-gradient-to-br", 
                                    stat.color === 'neon-green' ? 'from-neon-green to-emerald-500' : 
                                    stat.color === 'neon-blue' ? 'from-neon-blue to-cyan-500' : 
                                    stat.color === 'neon-pink' ? 'from-neon-pink to-purple-500' : 'from-purple-500 to-indigo-500'
                                )} />
                                <div className={cn(
                                    "p-6 md:p-8 h-full bg-white dark:bg-zinc-950/35 backdrop-blur-3xl border transition-all duration-500 rounded-3xl flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
                                    stat.isActive
                                        ? "border-neon-green/40 shadow-[0_0_20px_rgba(57,255,20,0.15)] ring-1 ring-neon-green/30"
                                        : "border-gray-200 dark:border-white/5",
                                    hoverBorder
                                )}>
                                    <div className="flex items-start justify-between mb-8">
                                        <div className={cn("p-4 rounded-2xl border flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500", 
                                            stat.color === 'neon-green' ? 'text-emerald-600 dark:text-[#39FF14] bg-emerald-50 dark:bg-[#39FF14]/5 border-emerald-200 dark:border-[#39FF14]/10 group-hover:border-emerald-400 dark:group-hover:border-[#39FF14]/30' : 
                                            (stat.color === 'neon-blue' ? 'text-sky-600 dark:text-[#00F0FF] bg-sky-50 dark:bg-[#00F0FF]/5 border-sky-200 dark:border-[#00F0FF]/10 group-hover:border-sky-400 dark:group-hover:border-[#00F0FF]/30' : 
                                            (stat.color === 'neon-pink' ? 'text-rose-600 dark:text-[#FF4F8B] bg-rose-50 dark:bg-[#FF4F8B]/5 border-rose-200 dark:border-[#FF4F8B]/10 group-hover:border-rose-400 dark:group-hover:border-[#FF4F8B]/30' : 'text-purple-600 dark:text-[#A855F7] bg-purple-50 dark:bg-[#A855F7]/5 border-purple-200 dark:border-[#A855F7]/10 group-hover:border-purple-400 dark:group-hover:border-[#A855F7]/30'))
                                        )}>
                                            <stat.icon size={24} />
                                        </div>
                                        {stat.isActive && (
                                            <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-neon-green/10 text-neon-green border border-neon-green/30 animate-pulse">
                                                ACTIVE VIEW
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-4xl md:text-5xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white mb-2 leading-none">{stat.value}</h3>
                                        <p className="text-gray-500 text-[10px] md:text-[9px] font-black uppercase tracking-[0.3em]">{stat.label}</p>
                                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                            <p className="text-gray-600 dark:text-gray-400 text-[10px] md:text-[9px] font-bold uppercase tracking-widest">{stat.detail}</p>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none transform translate-x-4 -translate-y-4">
                                        <stat.icon size={160} />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ── PRIMARY TAB SELECTOR ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 rounded-2xl w-full sm:w-auto backdrop-blur-xl overflow-x-auto no-scrollbar">
                    {[
                        { id: 'members', label: 'Registered Members', count: totalCount, icon: Users, color: 'text-neon-blue' },
                        { id: 'active', label: 'Active Personnel', count: activeCount, icon: UserCheck, color: 'text-neon-green' },
                        { id: 'admins', label: 'Command Staff', count: admins.filter(a => a.role !== 'pending').length, icon: Shield, color: 'text-neon-pink' },
                        ...(canAuthorizeStaff ? [{ id: 'requests', label: 'Pending Clearances', count: pendingRequests.length, icon: Clock, color: 'text-yellow-400' }] : [])
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap shrink-0",
                                    isActive
                                        ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm border border-black/10 dark:border-white/10 scale-[1.02]"
                                        : "text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                                )}
                            >
                                <TabIcon size={14} className={isActive ? tab.color : "text-gray-400"} />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-md text-[8px] font-mono font-bold",
                                        isActive ? "bg-neon-green/15 text-neon-green" : "bg-black/5 dark:bg-white/5 text-gray-500"
                                    )}>
                                        {tab.count.toLocaleString()}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* View Mode Toggle for Member views */}
                {(activeTab === 'members' || activeTab === 'active') && (
                    <div className="flex items-center p-1.5 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 rounded-2xl gap-1 shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                viewMode === 'grid' ? "bg-neon-green text-black shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                            )}
                            title="Grid Card View"
                        >
                            <LayoutGrid size={15} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                viewMode === 'table' ? "bg-neon-green text-black shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                            )}
                            title="Table Grid View"
                        >
                            <Activity size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── TAB CONTENT ───────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">

                {/* TAB: MEMBERS (ALL) or ACTIVE PERSONNEL */}
                {(activeTab === 'members' || activeTab === 'active') && (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {/* Search + Filter Bar */}
                        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
                            {/* Search Box */}
                            <div className="relative flex-1 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-green transition-colors" size={16} />
                                <input
                                    value={memberSearch}
                                    onChange={e => setMemberSearch(e.target.value)}
                                    placeholder={activeTab === 'active' ? "Search active personnel by name, email, role, phone..." : "Search registered members by name, email, role, phone..."}
                                    className="w-full bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 focus:border-neon-green/30 h-12 pl-12 pr-10 rounded-2xl text-[11px] font-semibold outline-none transition-all placeholder:text-gray-400 placeholder:font-normal"
                                />
                                {memberSearch && (
                                    <button onClick={() => setMemberSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Sub-Filters */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 rounded-2xl shrink-0">
                                {[
                                    { id: 'all', label: `All (${activeTab === 'active' ? activeCount : totalCount})` },
                                    { id: 'active', label: `Active Users (${activeCount})` },
                                    { id: 'admins', label: `Administrators (${admins.filter(a => a.role !== 'pending').length})` },
                                    { id: 'suspended', label: `Suspended (${suspendedCount})` }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setMemberFilter(f.id)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                            memberFilter === f.id
                                                ? "bg-neon-green/15 text-neon-green border border-neon-green/25 font-extrabold"
                                                : "text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Results Count & Quick Stats Bar */}
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">
                            <p>
                                {memberSearch || memberFilter !== 'all'
                                    ? `Found ${filteredMembers.length} matching result${filteredMembers.length !== 1 ? 's' : ''}`
                                    : `Showing ${filteredMembers.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}–${Math.min(currentPage * itemsPerPage, filteredMembers.length)} of ${filteredMembers.length} records`
                                }
                            </p>
                            {totalPages > 1 && (
                                <p className="font-mono text-gray-400">Page {currentPage} of {totalPages}</p>
                            )}
                        </div>

                        {/* Main Records Display */}
                        {filteredMembers.length === 0 ? (
                            <div className="py-24 text-center bg-gray-100/50 dark:bg-white/[0.01] border border-dashed border-black/10 dark:border-white/5 rounded-[2.5rem]">
                                <Users size={36} className="mx-auto text-gray-400 mb-4 animate-pulse" />
                                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">No matching personnel records found</h3>
                                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                    {memberSearch || memberFilter !== 'all'
                                        ? "No members matched your specific search term or filter filter selection."
                                        : "No user accounts have been loaded yet. You can synchronize accounts from Firebase Auth."
                                    }
                                </p>
                                <div className="mt-5 flex items-center justify-center gap-3">
                                    {(memberSearch || memberFilter !== 'all') && (
                                        <button
                                            onClick={() => { setMemberSearch(''); setMemberFilter('all'); }}
                                            className="px-4 py-2 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neon-green hover:text-black transition-all"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSyncAuthUsers}
                                        className="px-4 py-2 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all"
                                    >
                                        Sync Auth Members
                                    </button>
                                </div>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {paginatedMembers.map(member => (
                                    <MemberCard
                                        key={member.id || member.email}
                                        member={member}
                                        creators={creators}
                                        artists={artists}
                                        onBlock={handleBlockUser}
                                        onUnblock={handleUnblockUser}
                                        onRevokeSessions={handleRevokeMemberSessions}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-4">
                                <Card className="min-w-[900px] bg-gray-100 dark:bg-zinc-950/60 border-black/10 dark:border-white/5 rounded-[2rem] p-0 border overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-black/10 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                                <th className="p-5">Operative</th>
                                                <th className="p-5">Clearance</th>
                                                <th className="p-5">Affiliation</th>
                                                <th className="p-5">Registered</th>
                                                <th className="p-5">Last Seen</th>
                                                <th className="p-5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {paginatedMembers.map(member => {
                                                const isArtist = member.isArtist || artists?.some(a => (a.uid === member.id || a.email === member.email) && a.profileStatus === 'approved');
                                                const isCreator = member.isCreator || creators?.some(c => c.uid === member.id || c.email === member.email);
                                                const isTribe = member.hasJoinedTribe;
                                                const isAdmin = member.isAdmin || (member.role && member.role !== 'Member' && member.role !== 'member');

                                                const typeLabel = isArtist ? 'Artist' : isCreator ? 'Creator' : isAdmin ? (member.role || 'Admin') : isTribe ? 'Tribe' : member.isTicketHolder ? 'Ticket' : member.isSubscriber ? 'Subscriber' : 'Member';
                                                
                                                const typeStyle = isArtist ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B]'
                                                    : isCreator ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink'
                                                    : isAdmin ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                                    : isTribe ? 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue'
                                                    : member.isTicketHolder ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                                                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/5 text-gray-500';

                                                return (
                                                    <tr key={member.id || member.email} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black italic border shrink-0 select-none",
                                                                    member.isBlocked
                                                                        ? "bg-red-500/10 border-red-500/20 text-red-500"
                                                                        : "bg-neon-green/10 border-neon-green/20 text-neon-green"
                                                                )}>
                                                                    {(member.displayName || member.email || 'U').slice(0, 2).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white group-hover:text-neon-green transition-colors truncate max-w-[200px]">
                                                                        {member.displayName || 'UNNAMED'}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-[240px]">
                                                                        {member.email || '—'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            {member.isBlocked ? (
                                                                <span className="px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                    SUSPENDED
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                                                                    ACTIVE
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-5">
                                                            <span className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border", typeStyle)}>
                                                                {typeLabel}
                                                            </span>
                                                        </td>
                                                        <td className="p-5">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                                                                {member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="p-5">
                                                            {member.lastActive ? (
                                                                <span className="text-[10px] font-bold text-neon-blue uppercase tracking-widest font-mono">
                                                                    {new Date(member.lastActive).toLocaleDateString(undefined, { dateStyle: 'short' })}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500 text-[10px] font-mono">—</span>
                                                            )}
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex justify-end gap-1.5">
                                                                {member.isBlocked ? (
                                                                    <button
                                                                        onClick={() => handleUnblockUser(member)}
                                                                        className="px-3 h-8 bg-neon-green/10 hover:bg-neon-green text-neon-green hover:text-black border border-neon-green/20 hover:border-transparent rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                                                    >
                                                                        <CheckCircle size={11} /> Reinstate
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleBlockUser(member)}
                                                                            className="px-3 h-8 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                                                        >
                                                                            <ShieldAlert size={11} /> Suspend
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRevokeMemberSessions(member)}
                                                                            className="px-3 h-8 bg-black/5 dark:bg-white/5 hover:bg-red-500/15 text-gray-500 hover:text-red-400 border border-black/10 dark:border-white/5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                                                        >
                                                                            <LogOut size={11} /> Logout
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
                        )}

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-black/10 dark:border-white/5">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length} records
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => {
                                            setCurrentPage(prev => Math.max(prev - 1, 1));
                                            window.scrollTo({ top: 300, behavior: 'smooth' });
                                        }}
                                        className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 text-gray-900 dark:text-white rounded-xl transition-all"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {getPageNumbers(currentPage, totalPages).map((p, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (typeof p === 'number') {
                                                    setCurrentPage(p);
                                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                                }
                                            }}
                                            disabled={typeof p !== 'number'}
                                            className={cn(
                                                "min-w-[38px] h-9 px-2 rounded-xl text-[10px] font-black font-mono transition-all",
                                                currentPage === p
                                                    ? "bg-neon-green text-black font-extrabold shadow-sm"
                                                    : "bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => {
                                            setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                            window.scrollTo({ top: 300, behavior: 'smooth' });
                                        }}
                                        className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 text-gray-900 dark:text-white rounded-xl transition-all"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* TAB: COMMAND STAFF (ADMINS) */}
                {activeTab === 'admins' && (
                    <motion.div
                        key="admins"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                    >
                        {/* Invite / Credential Dispatch Panel */}
                        <AnimatePresence>
                            {isInviteOpen && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ overflow: 'clip' }}
                                >
                                    <div className="relative p-0.5 rounded-[2.5rem] bg-gradient-to-r from-neon-green/30 via-neon-blue/20 to-purple-500/30 mb-6">
                                        <Card className="p-8 sm:p-10 bg-white dark:bg-[#0B0F17]/95 border-none rounded-[2.4rem]">
                                            <div className="flex items-center justify-between mb-7 pb-4 border-b border-black/10 dark:border-white/5">
                                                <h2 className="text-base font-heading font-black italic uppercase tracking-tight flex items-center gap-3 text-gray-900 dark:text-white">
                                                    <Shield className="text-neon-green animate-pulse" size={18} /> DISPATCH OPERATIVE CREDENTIALS
                                                </h2>
                                                <button
                                                    onClick={() => setIsInviteOpen(false)}
                                                    className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-white transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                                                <div className="md:col-span-6 space-y-2">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                                                    <input
                                                        type="email"
                                                        value={newAdminEmail}
                                                        onChange={e => setNewAdminEmail(e.target.value)}
                                                        required
                                                        placeholder="operative@newbi.live"
                                                        className="w-full h-12 bg-gray-100 dark:bg-black/40 border border-black/10 dark:border-white/5 focus:border-neon-green/30 rounded-2xl px-5 text-xs font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 placeholder:font-normal"
                                                    />
                                                </div>
                                                <div className="md:col-span-4 space-y-2 relative z-30">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Clearance Level</label>
                                                    <StudioSelect
                                                        value={newAdminRole}
                                                        onChange={val => setNewAdminRole(val)}
                                                        options={getAdminRoleOptions('', canManageDevelopers, canManageFounders)}
                                                        accentColor="neon-green"
                                                        className="h-12"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    className="md:col-span-2 w-full h-12 bg-neon-green text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_8px_20px_rgba(57,255,20,0.2)] flex items-center justify-center gap-2"
                                                >
                                                    <UserPlus size={13} /> Dispatch
                                                </button>
                                            </form>
                                        </Card>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Search + Role Filters for Command Staff */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-green transition-colors" size={16} />
                                <input
                                    value={adminSearch}
                                    onChange={e => setAdminSearch(e.target.value)}
                                    placeholder="Search command staff by email, name, role..."
                                    className="w-full bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 focus:border-neon-green/30 h-12 pl-12 pr-10 rounded-2xl text-[11px] font-semibold outline-none transition-all placeholder:text-gray-400 placeholder:font-normal"
                                />
                                {adminSearch && (
                                    <button onClick={() => setAdminSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 rounded-2xl overflow-x-auto no-scrollbar shrink-0">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'content_admin', label: 'Content' },
                                    { id: 'gate_manager', label: 'Ticketing' },
                                    { id: 'blog_writer', label: 'Blog' },
                                    { id: 'super_admin', label: 'Super Admin' },
                                    ...(canManageFounders ? [{ id: 'founder', label: 'Founder' }] : []),
                                    ...(canManageDevelopers ? [{ id: 'developer', label: 'Dev' }] : [])
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setAdminFilter(f.id)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                            adminFilter === f.id
                                                ? "bg-neon-green/15 text-neon-green border border-neon-green/25 font-extrabold"
                                                : "text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Admin Cards Grid */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/5">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                                    <Shield size={13} className="text-neon-green" /> Active Command Staff ({filteredAdmins.length})
                                </h3>
                            </div>

                            {loadingAdmins ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-64 rounded-[2.5rem] bg-gray-200 dark:bg-white/5 animate-pulse" />
                                    ))}
                                </div>
                            ) : filteredAdmins.length === 0 ? (
                                <div className="py-20 text-center bg-gray-100/50 dark:bg-white/[0.01] border border-dashed border-black/10 dark:border-white/5 rounded-[2rem]">
                                    <Shield size={32} className="mx-auto text-gray-400 mb-3" />
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No matching command staff found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filteredAdmins.map(admin => {
                                        const isSelf = admin.email === user.email;
                                        const badge = getRoleBadgeStyle(admin.role);

                                        return (
                                            <motion.div key={admin.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="group relative has-[.select-open]:z-50">
                                                <Card className="relative p-7 bg-gray-100 dark:bg-zinc-950/60 group-hover:bg-gray-50 dark:group-hover:bg-zinc-900/50 border-black/10 dark:border-white/5 hover:border-black/15 dark:hover:border-white/10 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-md hover:shadow-xl flex flex-col gap-5 border hover:-translate-y-1 min-h-[300px]">
                                                    <div className={cn("absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r rounded-t-[2.5rem]", badge.bar)} />

                                                    <div className="flex justify-between items-start">
                                                        <span className={cn("px-2.5 py-1 rounded-full border font-black uppercase tracking-widest text-[8px]", badge.bg, badge.border, badge.text)}>
                                                            {badge.label}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {isSelf && (
                                                                <span className="px-2 py-0.5 bg-white dark:bg-white/10 text-black dark:text-white border border-black/10 dark:border-white/10 rounded-md text-[7px] font-black uppercase tracking-widest">
                                                                    You
                                                                </span>
                                                            )}
                                                            <span className="px-2.5 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                                ACTIVE
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1">
                                                        <h3 className="font-heading font-black text-xl sm:text-2xl text-gray-900 dark:text-white group-hover:text-neon-green transition-colors uppercase italic tracking-tighter leading-tight line-clamp-2">
                                                            {admin.displayName || 'UNIDENTIFIED OPERATIVE'}
                                                        </h3>
                                                        <p className="text-[10px] text-gray-500 font-mono mt-1 break-all select-all">{admin.email}</p>
                                                    </div>

                                                    <div className="space-y-1.5 relative z-30">
                                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Clearance Level</p>
                                                        {canEditRoles ? (
                                                            <StudioSelect
                                                                value={admin.role}
                                                                onChange={val => handleUpdateRole(admin.id, val)}
                                                                options={getAdminRoleOptions(admin.role, canManageDevelopers, canManageFounders)}
                                                                disabled={isSelf}
                                                                accentColor="neon-green"
                                                                className="h-11"
                                                            />
                                                        ) : (
                                                            <span className={cn("px-3 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border inline-flex items-center justify-center w-full", badge.bg, badge.border, badge.text)}>
                                                                {badge.label}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-wide">
                                                        Authorized: <span className="font-mono text-gray-600 dark:text-gray-400">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</span>
                                                    </span>

                                                    <div className="pt-3 border-t border-black/10 dark:border-white/5 flex flex-wrap gap-2">
                                                        {(isSelf || user.role === 'developer' || user.role === 'founder') && (
                                                            <button
                                                                onClick={() => {
                                                                    const n = prompt(`Rename ${admin.email}:`, admin.displayName || "");
                                                                    if (n !== null && n.trim() !== "") {
                                                                        useStore.getState().updateAdminProfile(null, admin.email, { displayName: n.trim() }).then(() => fetchAdmins());
                                                                    }
                                                                }}
                                                                className="flex-1 h-10 bg-black/5 dark:bg-white/5 hover:bg-neon-blue/10 text-gray-500 hover:text-neon-blue border border-black/10 dark:border-white/5 hover:border-neon-blue/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <Edit3 size={11} /> Rename
                                                            </button>
                                                        )}

                                                        {!isSelf && canEditRoles && (
                                                            <>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm(`Send password reset credentials to ${admin.email}?`)) {
                                                                            await useStore.getState().resetPassword(admin.email);
                                                                            useStore.getState().addToast("Password reset email sent!", 'success');
                                                                        }
                                                                    }}
                                                                    className="flex-1 h-10 bg-black/5 dark:bg-white/5 hover:bg-neon-pink/10 text-gray-500 hover:text-neon-pink border border-black/10 dark:border-white/5 hover:border-neon-pink/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    <KeyRound size={11} /> Reset
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveAdmin(admin.id, admin.role)}
                                                                    className="flex-1 h-10 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 border border-black/10 dark:border-white/5 hover:border-red-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    <Trash2 size={11} /> Remove
                                                                </button>
                                                            </>
                                                        )}

                                                        {!isSelf && (user?.role === 'developer' || user?.role === 'founder') && (
                                                            <button
                                                                onClick={() => handleRevokeAdminSessions(admin)}
                                                                className="w-full h-10 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 border border-black/10 dark:border-white/5 hover:border-red-500/15 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <LogOut size={11} /> Log Out All Devices
                                                            </button>
                                                        )}
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </motion.div>
                )}

                {/* TAB: PENDING CLEARANCE REQUESTS */}
                {activeTab === 'requests' && canAuthorizeStaff && (
                    <motion.div
                        key="requests"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        <div className="relative group max-w-md">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors" size={16} />
                            <input
                                value={adminSearch}
                                onChange={e => setAdminSearch(e.target.value)}
                                placeholder="Search pending requests..."
                                className="w-full bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 focus:border-yellow-500/30 h-12 pl-12 pr-10 rounded-2xl text-[11px] font-semibold outline-none transition-all placeholder:text-gray-400 placeholder:font-normal"
                            />
                            {adminSearch && (
                                <button onClick={() => setAdminSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {filteredRequests.length === 0 ? (
                            <div className="py-28 bg-gray-100/50 dark:bg-white/[0.01] rounded-[2.5rem] border border-dashed border-black/10 dark:border-white/5 text-center">
                                <Clock size={36} className="mx-auto text-gray-400 mb-4" />
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">No pending clearance requests</h4>
                                <p className="text-[10px] text-gray-400 mt-1">All staff access requests have been audited.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {filteredRequests.map(admin => (
                                    <motion.div key={admin.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="group relative has-[.select-open]:z-50">
                                        <div className="absolute inset-0 rounded-[2.5rem] bg-yellow-500/5 blur-xl pointer-events-none" />
                                        <Card className="relative p-7 bg-gray-100 dark:bg-zinc-950/60 border-yellow-500/15 hover:border-yellow-500/30 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-md hover:-translate-y-1 flex flex-col gap-5 border">
                                            <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-yellow-500/60 to-amber-500/40 rounded-t-[2.5rem]" />
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                                                    <Clock size={16} className="text-yellow-500 animate-pulse" />
                                                </div>
                                                <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                    Awaiting Clearance
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-mono font-bold text-base text-gray-900 dark:text-white break-all">{admin.email}</h3>
                                                <p className="text-[9px] text-yellow-500/60 font-black uppercase tracking-widest mt-1">
                                                    Requested {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-black/10 dark:border-white/5 relative z-30">
                                                <button
                                                    onClick={() => handleRemoveAdmin(admin.id, admin.role)}
                                                    className="flex-1 h-11 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    Deny Request
                                                </button>
                                                <div className="flex-1 relative z-30">
                                                    <StudioSelect
                                                        value=""
                                                        onChange={val => handleApprove(admin.id, val)}
                                                        options={getAdminRoleOptions('', canManageDevelopers, canManageFounders)}
                                                        placeholder="APPROVE & ASSIGN ROLE"
                                                        accentColor="neon-green"
                                                        className="h-11"
                                                    />
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

            </AnimatePresence>
        </AdminCommunityHubLayout>
    );
};

export default AdminManager;
