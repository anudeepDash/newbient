import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Clock from 'lucide-react/dist/esm/icons/clock';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import X from 'lucide-react/dist/esm/icons/x';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Zap from 'lucide-react/dist/esm/icons/zap';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import StudioSelect from '../../components/ui/StudioSelect';
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

const getSelectAccentColor = (role) => {
    if (role === 'founder' || role === 'super_admin' || role === 'developer') return 'neon-pink';
    if (role === 'content_admin' || role === 'editor') return 'neon-green';
    return 'neon-blue';
};

const PAGE_SIZE = 24;

// ─── Skeleton Loaders ──────────────────────────────────────────────────────────

const SkeletonCard = () => (
    <div className="rounded-[2.5rem] bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/5 p-6 sm:p-7 space-y-4 animate-pulse min-h-[340px] flex flex-col">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-200 dark:bg-white/10" />
                <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
        </div>
        <div className="flex-1 space-y-2 pt-2">
            <div className="h-7 w-3/4 rounded-xl bg-gray-200 dark:bg-white/10" />
            <div className="h-3 w-2/3 rounded-lg bg-gray-200 dark:bg-white/5" />
        </div>
        <div className="flex gap-2">
            <div className="h-7 w-28 rounded-xl bg-gray-200 dark:bg-white/5" />
            <div className="h-7 w-24 rounded-xl bg-gray-200 dark:bg-white/5" />
        </div>
        <div className="pt-4 border-t border-black/10 dark:border-white/5 space-y-2 mt-auto">
            <div className="h-11 w-full rounded-xl bg-gray-200 dark:bg-white/10" />
        </div>
    </div>
);

const SkeletonRow = () => (
    <tr className="animate-pulse border-b border-black/5 dark:border-white/5">
        <td className="p-5"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0" /><div className="space-y-1.5"><div className="h-3 w-32 rounded bg-gray-200 dark:bg-white/10" /><div className="h-2.5 w-48 rounded bg-gray-200 dark:bg-white/5" /></div></div></td>
        <td className="p-5"><div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-white/10" /></td>
        <td className="p-5"><div className="h-5 w-20 rounded-lg bg-gray-200 dark:bg-white/10" /></td>
        <td className="p-5"><div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10" /></td>
        <td className="p-5"><div className="h-3 w-20 rounded bg-gray-200 dark:bg-white/10" /></td>
        <td className="p-5"><div className="flex justify-end gap-2"><div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-white/10" /></div></td>
    </tr>
);

// ─── Member Card ───────────────────────────────────────────────────────────────

const MemberCard = ({ member, creators, artists, onBlock, onUnblock, onRevokeSessions }) => {
    const isTribe = member.hasJoinedTribe;
    const isCreator = member.isCreator || creators?.some(c => c.uid === member.id || c.email === member.email);
    const isArtist = member.isArtist || artists?.some(a => (a.uid === member.id || a.email === member.email) && a.profileStatus === 'approved');
    const isTicketHolder = member.isTicketHolder;
    const isSubscriber = member.isSubscriber;

    const typeLabel = isArtist ? 'Artist' : isCreator ? 'Creator' : isTribe ? 'Tribe' : isTicketHolder ? 'Ticket Holder' : isSubscriber ? 'Subscriber' : 'Member';
    const typeStyle = isArtist ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B]'
        : isCreator ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink'
        : isTribe ? 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue'
        : isTicketHolder ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
        : isSubscriber ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/5 text-gray-500';

    const avatarStyle = member.isBlocked
        ? 'bg-red-500/10 border-red-500/20 text-red-500'
        : isArtist ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/30 text-[#FF6B6B]'
        : isCreator ? 'bg-neon-pink/10 border-neon-pink/30 text-neon-pink'
        : isTribe ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue'
        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-700 dark:text-white/60';

    const barStyle = member.isBlocked
        ? 'from-red-500/60 to-orange-500/40'
        : isArtist ? 'from-[#FF6B6B]/60 to-pink-500/40'
        : isCreator ? 'from-neon-pink/60 to-purple-500/40'
        : isTribe ? 'from-neon-blue/60 to-indigo-500/40'
        : 'from-white/10 to-transparent';

    return (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group relative flex flex-col h-full">
            <div className={cn("absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-10 transition-opacity blur-2xl duration-700 pointer-events-none bg-gradient-to-br", member.isBlocked ? "from-red-500 to-orange-500" : "from-neon-green to-neon-blue")} />
            <Card className={cn("relative p-6 sm:p-7 bg-gray-100 dark:bg-zinc-950/60 group-hover:bg-gray-50 dark:group-hover:bg-zinc-900/50 border-black/10 dark:border-white/5 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-md hover:shadow-xl flex flex-col h-full min-h-[340px] overflow-hidden border hover:-translate-y-1 gap-4", member.isBlocked && "border-red-500/10 hover:border-red-500/20")}>
                <div className={cn("absolute top-0 left-0 w-full h-[2px] rounded-t-[2.5rem] bg-gradient-to-r", barStyle)} />

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
                    {member.isBlocked
                        ? <span className="px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">SUSPENDED</span>
                        : <span className="px-2.5 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">ACTIVE</span>
                    }
                </div>

                {/* Name + Email */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-black text-xl sm:text-2xl text-gray-900 dark:text-white group-hover:text-neon-green transition-colors duration-400 uppercase italic tracking-tighter leading-tight line-clamp-2">
                        {member.displayName || 'UNNAMED MEMBER'}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-1 break-all leading-relaxed">{member.email || '—'}</p>
                    {member.phone && <p className="text-[10px] text-gray-600 font-mono mt-0.5">{member.phone}</p>}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1.5 text-[9px] text-gray-500 font-black uppercase tracking-wide bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 px-3 py-1.5 rounded-xl">
                        <span className="text-gray-400">JOINED</span>
                        <span className="text-gray-700 dark:text-gray-300 font-mono">{member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</span>
                    </span>
                    {member.lastActive && (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide bg-neon-blue/5 border border-neon-blue/10 px-3 py-1.5 rounded-xl text-neon-blue">
                            <span className="text-neon-blue/50">SEEN</span>
                            <span className="font-mono">{new Date(member.lastActive).toLocaleDateString(undefined, { dateStyle: 'short' })}</span>
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-black/10 dark:border-white/5 flex flex-col gap-2 mt-auto">
                    {member.isBlocked ? (
                        <button onClick={() => onUnblock(member)} className="w-full h-11 bg-neon-green text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(57,255,20,0.2)]">
                            <CheckCircle size={12} /> Reinstate Access
                        </button>
                    ) : (
                        <>
                            <button onClick={() => onBlock(member)} className="w-full h-11 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-black uppercase tracking-widest text-[9px] rounded-xl border border-red-500/20 hover:border-transparent transition-all flex items-center justify-center gap-2 duration-300 active:scale-95">
                                <ShieldAlert size={12} /> Suspend Access
                            </button>
                            <button onClick={() => onRevokeSessions(member)} className="w-full h-10 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 font-black uppercase tracking-widest text-[9px] rounded-xl border border-black/10 dark:border-white/5 hover:border-red-500/15 transition-all flex items-center justify-center gap-2 duration-200 active:scale-95">
                                <LogOut size={11} /> Log Out All Devices
                            </button>
                        </>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const AdminManager = () => {
    useStoreSubscription(['creators', 'artists', 'admins', 'subscribers', 'allUsers']);
    const { user, blockUser, unblockUser, creators = [], artists = [], subscribers = [], admins: storeAdmins = [], allUsers = [] } = useStore();

    const [activeTab, setActiveTab] = useState('members');

    // ── Admin state ──
    const [localAdmins, setLocalAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminRole, setNewAdminRole] = useState('content_admin');
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [adminSearch, setAdminSearch] = useState('');
    const [adminFilter, setAdminFilter] = useState('all');

    const admins = useMemo(() => {
        const source = (storeAdmins && storeAdmins.length > 0) ? storeAdmins : localAdmins;
        return (source || []).map(a => ({ ...a, id: a.id || a.uid, uid: a.uid || a.id }));
    }, [storeAdmins, localAdmins]);

    const pendingRequests = useMemo(() => admins.filter(a => a.role === 'pending'), [admins]);

    // ── Members paginated state ──
    const [membersData, setMembersData] = useState([]);
    const [membersTotal, setMembersTotal] = useState(null);
    const [membersLoading, setMembersLoading] = useState(true);
    const [membersPage, setMembersPage] = useState(1);
    const [cursors, setCursors] = useState([null]);
    const [hasMore, setHasMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [memberFilter, setMemberFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    // ─── Fetch helpers ────────────────────────────────────────────────────────

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

    const fetchMembersCount = useCallback(async () => {
        const count = await useStore.getState().fetchMembersCount();
        if (count !== null) {
            setMembersTotal(count);
        } else {
            // Fallback: use allUsers length from the store listener
            const storeUsers = useStore.getState().allUsers || [];
            if (storeUsers.length > 0) setMembersTotal(storeUsers.length);
        }
    }, []);

    const loadMembersPage = useCallback(async (page, cursorsArr) => {
        setMembersLoading(true);
        try {
            const lastDoc = cursorsArr[page - 1] || null;
            const result = await useStore.getState().fetchMembersPage(PAGE_SIZE, lastDoc);
            if (result.data.length > 0) {
                setMembersData(result.data);
                setHasMore(result.hasMore);
                if (result.lastVisible && page >= cursorsArr.length) {
                    setCursors(prev => {
                        const next = [...prev];
                        next[page] = result.lastVisible;
                        return next;
                    });
                }
            } else {
                // fetchMembersPage returned empty — fall back to allUsers store data (capped at 444 but better than nothing)
                console.warn('[AdminManager] fetchMembersPage returned 0 docs, falling back to allUsers store');
                const storeUsers = useStore.getState().allUsers || [];
                if (storeUsers.length > 0) {
                    const sorted = [...storeUsers].sort((a, b) => {
                        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return tb - ta;
                    });
                    setMembersData(sorted.slice(0, PAGE_SIZE));
                    setHasMore(sorted.length > PAGE_SIZE);
                    useStore.getState().addToast('Showing cached members — paginated fetch failed, check console.', 'warning');
                }
            }
        } catch (err) {
            console.error('[AdminManager] loadMembersPage threw:', err);
            useStore.getState().addToast('Failed to load members: ' + (err?.message || 'Unknown error'), 'error');
        } finally {
            setMembersLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmins();
        fetchMembersCount();
        loadMembersPage(1, [null]);
    }, []);

    // Fallback: when allUsers store listener loads (up to 444 docs), use it if paginated fetch returned nothing
    useEffect(() => {
        if (allUsers.length > 0 && membersData.length === 0 && !membersLoading) {
            console.log('[AdminManager] Using allUsers store fallback:', allUsers.length, 'docs');
            const sorted = [...allUsers].sort((a, b) => {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tb - ta;
            });
            setMembersData(sorted.slice(0, PAGE_SIZE));
            setHasMore(sorted.length > PAGE_SIZE);
            if (membersTotal === null) setMembersTotal(allUsers.length);
        }
    }, [allUsers, membersLoading]);

    const handlePageChange = (newPage) => {
        setMembersPage(newPage);
        loadMembersPage(newPage, cursors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRefreshMembers = async () => {
        setIsRefreshing(true);
        const freshCursors = [null];
        setCursors(freshCursors);
        setMembersPage(1);
        await Promise.all([fetchMembersCount(), loadMembersPage(1, freshCursors)]);
        setIsRefreshing(false);
        useStore.getState().addToast('Member registry refreshed!', 'success');
    };

    // ─── Admin actions ────────────────────────────────────────────────────────

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!(user?.role === 'developer' || user?.role === 'founder')) {
            useStore.getState().addToast("You don't have permission to add new admins.", 'error'); return;
        }
        try {
            const q = query(collection(db, 'admins'), where('email', '==', newAdminEmail));
            const existing = await getDocs(q);
            if (!existing.empty) { useStore.getState().addToast('This person is already an admin.', 'error'); return; }
            await addDoc(collection(db, 'admins'), { email: newAdminEmail, role: newAdminRole, addedBy: user.email, createdAt: new Date().toISOString() });
            const emailSentTo = newAdminEmail;
            const roleAssigned = newAdminRole;
            setNewAdminEmail('');
            fetchAdmins();
            useStore.getState().addToast("Admin added! They'll need to sign up to get started.", 'success');
            sendStaffAuthorizedEmail(emailSentTo, roleAssigned).catch(err => console.error('Failed to send authorization email:', err));
        } catch (err) {
            useStore.getState().addToast("Couldn't add the admin. Please try again.", 'error');
        }
    };

    const handleApprove = async (id, role) => {
        if (!(user?.role === 'developer' || user?.role === 'founder')) { useStore.getState().addToast("You don't have permission to approve admin requests.", 'error'); return; }
        try {
            const adminDoc = admins.find(a => a.id === id);
            await updateDoc(doc(db, 'admins', id), { role });
            fetchAdmins();
            useStore.getState().addToast(`Role updated to ${role}.`, 'success');
            if (adminDoc?.email) sendStaffAuthorizedEmail(adminDoc.email, role).catch(err => console.error('Failed to send authorization email:', err));
        } catch (err) {
            useStore.getState().addToast("Couldn't update the role. Please try again.", 'error');
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        if (!canEditRoles()) { useStore.getState().addToast("You don't have permission to change this person's role.", 'error'); return; }
        try { await updateDoc(doc(db, 'admins', id), { role: newRole }); fetchAdmins(); }
        catch (err) { useStore.getState().addToast("Couldn't update the role. Please try again.", 'error'); }
    };

    const handleRemoveAdmin = async (id, targetRole) => {
        if (!canEditRoles()) { useStore.getState().addToast("You don't have permission to change this person's role.", 'error'); return; }
        if (window.confirm('Remove this admin? They will lose all admin access immediately.')) {
            try { await deleteDoc(doc(db, 'admins', id)); fetchAdmins(); }
            catch (err) { useStore.getState().addToast("Couldn't remove the admin. Please try again.", 'error'); }
        }
    };

    const handleBlockUser = async (member) => {
        if (window.confirm(`Suspend ${member.email}? They won't be able to access their account.`)) {
            try {
                await blockUser(member.id);
                setMembersData(prev => prev.map(m => m.id === member.id ? { ...m, isBlocked: true } : m));
            } catch (err) { useStore.getState().addToast('Something went wrong. Please try again.', 'error'); }
        }
    };

    const handleUnblockUser = async (member) => {
        if (window.confirm(`Reinstate ${member.email}? They'll be able to access their account again.`)) {
            try {
                await unblockUser(member.id);
                setMembersData(prev => prev.map(m => m.id === member.id ? { ...m, isBlocked: false } : m));
            } catch (err) { useStore.getState().addToast('Something went wrong. Please try again.', 'error'); }
        }
    };

    const handleRevokeMemberSessions = async (member) => {
        if (window.confirm(`Log ${member.displayName || member.email} out of all devices?`)) {
            try {
                await useStore.getState().revokeSessions(member.id, member.email);
                useStore.getState().addToast(`Logged out all devices for ${member.displayName || member.email}.`, 'success');
            } catch (err) { useStore.getState().addToast(err.message || 'Failed to revoke sessions', 'error'); }
        }
    };

    const handleRevokeAdminSessions = async (admin) => {
        if (window.confirm(`Log admin ${admin.displayName || admin.email} out of all devices?`)) {
            try {
                await useStore.getState().revokeSessions(admin.uid || null, admin.email);
                useStore.getState().addToast(`Logged out all devices for ${admin.displayName || admin.email}.`, 'success');
            } catch (err) { useStore.getState().addToast(err.message || 'Failed to revoke sessions', 'error'); }
        }
    };

    const handleSyncAuthUsers = async () => {
        if (!window.confirm('Synchronize all registered user accounts from Firebase Authentication into the Firestore member database?')) return;
        setIsSyncing(true);
        try {
            const result = await useStore.getState().syncAuthUsers();
            useStore.getState().addToast(result.message || `Successfully synced ${result.syncedCount} members!`, 'success');
            await handleRefreshMembers();
        } catch (err) {
            useStore.getState().addToast(err.message || 'Failed to synchronize users.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // ─── Derived values ───────────────────────────────────────────────────────

    const canAuthorizeStaff = user?.role === 'developer' || user?.role === 'founder';
    const canManageDevelopers = user?.role === 'developer' || user?.role === 'founder';
    const canManageFounders = user?.role === 'developer' || user?.role === 'founder';
    const canEditRoles = () => user?.role === 'developer' || user?.role === 'founder';

    const displayAdmins = user?.role === 'developer' || user?.role === 'founder'
        ? admins
        : user?.role === 'super_admin'
            ? admins.filter(a => a.role !== 'developer')
            : admins.filter(a => a.role !== 'developer' && a.role !== 'founder');

    const filteredMembers = useMemo(() => {
        const searchLower = (memberSearch || '').toLowerCase();
        return membersData.filter(m => {
            const matchesSearch = !searchLower ||
                (m.email || '').toLowerCase().includes(searchLower) ||
                (m.displayName || '').toLowerCase().includes(searchLower) ||
                (m.phone || '').toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
            if (memberFilter === 'active') return !m.isBlocked;
            if (memberFilter === 'suspended') return m.isBlocked;
            if (memberFilter === 'tribe') return m.hasJoinedTribe;
            if (memberFilter === 'creators') return m.isCreator || creators?.some(c => c.uid === m.id || c.email === m.email);
            if (memberFilter === 'artists') return m.isArtist || artists?.some(a => (a.uid === m.id || a.email === m.email) && a.profileStatus === 'approved');
            if (memberFilter === 'tickets') return m.isTicketHolder;
            if (memberFilter === 'subscribers') return m.isSubscriber;
            return true;
        });
    }, [membersData, memberSearch, memberFilter, creators, artists]);

    const filteredAdmins = useMemo(() => {
        const searchLower = (adminSearch || '').toLowerCase();
        return displayAdmins.filter(a => {
            if (a.role === 'pending') return false;
            const matchesSearch = !searchLower || (a.email || '').toLowerCase().includes(searchLower) || (a.displayName || '').toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
            if (adminFilter !== 'all') {
                if (adminFilter === 'content_admin') return a.role === 'content_admin' || a.role === 'editor';
                if (adminFilter === 'gate_manager') return a.role === 'gate_manager' || a.role === 'scanner';
                return a.role === adminFilter;
            }
            return true;
        });
    }, [displayAdmins, adminSearch, adminFilter]);

    const filteredRequests = useMemo(() =>
        pendingRequests.filter(a => (a.email || '').toLowerCase().includes((adminSearch || '').toLowerCase())),
        [pendingRequests, adminSearch]
    );

    const totalPages = membersTotal ? Math.ceil(membersTotal / PAGE_SIZE) : null;
    const startIdx = (membersPage - 1) * PAGE_SIZE + 1;
    const endIdx = Math.min(membersPage * PAGE_SIZE, membersTotal || membersPage * PAGE_SIZE);

    // ─── Access guard ─────────────────────────────────────────────────────────

    if (user?.role !== 'super_admin' && user?.role !== 'developer' && user?.role !== 'founder') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#020202]">
                <div className="text-center p-12 bg-white dark:bg-zinc-900/40 backdrop-blur-3xl border border-gray-200 dark:border-white/5 rounded-[3rem] max-w-md mx-auto shadow-xl">
                    <ShieldAlert size={48} className="mx-auto mb-6 text-red-500" />
                    <h1 className="text-3xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-black dark:to-white">ACCESS DENIED</h1>
                    <p className="text-gray-500 mt-4 text-sm font-medium">You don't have permission to view this page.</p>
                    <Link to="/admin" className="text-neon-blue mt-8 inline-block font-black uppercase text-[10px] tracking-widest hover:underline">Return to Admin Dashboard</Link>
                </div>
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Access & Members', subtitle: 'Registry', icon: Shield, accentClass: 'text-neon-green' }}
            accentColor="neon-green"
            hideTabs={true}
            action={
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {activeTab === 'members' && (
                        <>
                            <button
                                onClick={handleRefreshMembers}
                                disabled={isRefreshing || membersLoading}
                                className="w-full md:w-auto flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10 disabled:opacity-50"
                            >
                                <RefreshCw size={13} className={cn("text-neon-blue", (isRefreshing || membersLoading) && "animate-spin")} />
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </button>
                            <button
                                onClick={handleSyncAuthUsers}
                                disabled={isSyncing}
                                className={cn("w-full md:w-auto flex items-center justify-center gap-2.5 h-11 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all duration-300", isSyncing ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30 cursor-wait opacity-80" : "bg-neon-green text-black hover:scale-[1.02] active:scale-95 shadow-[0_6px_20px_rgba(57,255,20,0.25)]")}
                            >
                                <Zap size={13} className={isSyncing ? "animate-pulse" : ""} />
                                {isSyncing ? 'Syncing...' : 'Sync Auth Members'}
                            </button>
                        </>
                    )}
                    {activeTab === 'admins' && canAuthorizeStaff && (
                        <button
                            onClick={() => setIsInviteOpen(!isInviteOpen)}
                            className={cn("w-full md:w-auto flex items-center justify-center gap-2.5 h-11 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all duration-300", isInviteOpen ? "bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white border border-black/10 dark:border-white/10" : "bg-neon-green text-black hover:scale-[1.02] active:scale-95 shadow-[0_6px_20px_rgba(57,255,20,0.25)]")}
                        >
                            <UserPlus size={13} />
                            {isInviteOpen ? 'Close Panel' : 'Add Admin'}
                        </button>
                    )}
                </div>
            }
        >
            {/* ── KPI Stats Bar ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 mb-8">
                {[
                    { label: 'Total Members', value: membersTotal !== null ? membersTotal.toLocaleString() : '—', sub: membersTotal !== null ? 'Verified by Firestore' : 'Counting...', color: 'text-neon-blue', bar: 'from-neon-blue to-blue-500', loading: membersLoading && membersTotal === null },
                    { label: 'Admin Staff', value: admins.filter(a => a.role !== 'pending').length, sub: 'Active roles', color: 'text-neon-green', bar: 'from-neon-green to-emerald-500', loading: false },
                    { label: 'Creators & Artists', value: (creators?.length || 0) + (artists?.filter(a => a.profileStatus === 'approved').length || 0), sub: 'Verified profiles', color: 'text-neon-pink', bar: 'from-neon-pink to-purple-500', loading: false },
                    { label: 'Pending Approvals', value: pendingRequests.length, sub: 'Awaiting clearance', color: 'text-yellow-500', bar: 'from-yellow-500 to-amber-500', loading: false },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="group relative rounded-3xl bg-gray-100 dark:bg-zinc-950/50 border border-black/10 dark:border-white/5 p-5 md:p-6 transition-all duration-500 overflow-hidden hover:-translate-y-0.5">
                        <div className={cn("absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r rounded-t-3xl", stat.bar)} />
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">{stat.label}</p>
                        {stat.loading
                            ? <div className="h-8 w-20 rounded-xl bg-gray-200 dark:bg-white/10 animate-pulse mb-1" />
                            : <div className={cn("text-3xl md:text-4xl font-extrabold font-heading leading-none tracking-tight", stat.color)}>{stat.value}</div>
                        }
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wide mt-1.5">{stat.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Tab Switcher ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 rounded-2xl mb-6 w-full sm:w-auto backdrop-blur-xl overflow-x-auto no-scrollbar">
                {[
                    { id: 'members', label: 'Members', count: membersTotal, icon: Users },
                    { id: 'admins', label: 'Command Staff', count: admins.filter(a => a.role !== 'pending').length, icon: Shield },
                    ...(canAuthorizeStaff ? [{ id: 'requests', label: 'Pending', count: pendingRequests.length, icon: Clock }] : [])
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMemberSearch(''); setAdminSearch(''); }}
                            className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap shrink-0", isActive ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm border border-black/10 dark:border-white/10" : "text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5")}
                        >
                            <tab.icon size={13} className={isActive ? "text-neon-green" : "text-gray-500"} />
                            {tab.label}
                            {tab.count !== undefined && tab.count !== null && (
                                <span className={cn("px-1.5 py-0.5 rounded-md text-[8px] font-bold font-mono", isActive ? "bg-neon-green/15 text-neon-green" : "bg-black/5 dark:bg-white/5 text-gray-500")}>
                                    {typeof tab.count === 'number' ? tab.count.toLocaleString() : '—'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ───────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">

                {/* MEMBERS TAB */}
                {activeTab === 'members' ? (
                    <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="space-y-5">

                        {/* Search + Filters */}
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-green transition-colors" size={16} />
                                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search by name, email, or phone..." className="w-full bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 focus:border-neon-green/30 h-12 pl-12 pr-10 rounded-2xl text-[11px] font-semibold outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" />
                                {memberSearch && <button onClick={() => setMemberSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"><X size={13} /></button>}
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 rounded-2xl shrink-0">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'active', label: 'Active' },
                                    { id: 'suspended', label: 'Suspended' },
                                    { id: 'tribe', label: 'Tribe' },
                                    { id: 'creators', label: 'Creators' },
                                    { id: 'artists', label: 'Artists' },
                                    { id: 'tickets', label: 'Ticket Holders' },
                                    { id: 'subscribers', label: 'Subscribers' },
                                ].map(f => (
                                    <button key={f.id} onClick={() => setMemberFilter(f.id)} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap", memberFilter === f.id ? "bg-neon-green/15 text-neon-green border border-neon-green/25" : "text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent")}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center p-1.5 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 rounded-2xl gap-1 shrink-0">
                                <button onClick={() => setViewMode('grid')} className={cn("p-2.5 rounded-xl transition-all", viewMode === 'grid' ? "bg-neon-green text-black shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-white")}><LayoutGrid size={15} /></button>
                                <button onClick={() => setViewMode('list')} className={cn("p-2.5 rounded-xl transition-all", viewMode === 'list' ? "bg-neon-green text-black shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-white")}><FileText size={15} /></button>
                            </div>
                        </div>

                        {/* Count bar */}
                        {membersTotal !== null && !membersLoading && (
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    {memberSearch || memberFilter !== 'all'
                                        ? `${filteredMembers.length} result${filteredMembers.length !== 1 ? 's' : ''} on page ${membersPage}`
                                        : `Showing ${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${membersTotal.toLocaleString()} members`
                                    }
                                </p>
                                {totalPages && totalPages > 1 && (
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Page {membersPage} / {totalPages}</p>
                                )}
                            </div>
                        )}

                        {/* Grid / List */}
                        {membersLoading ? (
                            viewMode === 'grid'
                                ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
                                : <Card className="bg-gray-100 dark:bg-zinc-950/60 border-black/10 dark:border-white/5 rounded-[2rem] p-0 border overflow-hidden"><table className="w-full"><thead><tr className="border-b border-black/10 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500"><th className="p-5 text-left">Member</th><th className="p-5 text-left">Status</th><th className="p-5 text-left">Type</th><th className="p-5 text-left">Joined</th><th className="p-5 text-left">Last Active</th><th className="p-5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-black/5 dark:divide-white/5">{Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}</tbody></table></Card>
                        ) : filteredMembers.length === 0 ? (
                            <div className="py-24 text-center bg-gray-100/50 dark:bg-white/[0.01] border border-dashed border-black/10 dark:border-white/5 rounded-[2rem]">
                                <Users size={32} className="mx-auto text-gray-400 mb-4" />
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{memberSearch || memberFilter !== 'all' ? 'No members match your filters' : 'No members found'}</p>
                                {(memberSearch || memberFilter !== 'all') && <button onClick={() => { setMemberSearch(''); setMemberFilter('all'); }} className="mt-4 text-[10px] font-black text-neon-green uppercase tracking-widest hover:underline">Clear filters</button>}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredMembers.map(member => (
                                    <MemberCard key={member.id} member={member} creators={creators} artists={artists} onBlock={handleBlockUser} onUnblock={handleUnblockUser} onRevokeSessions={handleRevokeMemberSessions} />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-4">
                                <Card className="min-w-[860px] bg-gray-100 dark:bg-zinc-950/60 border-black/10 dark:border-white/5 rounded-[2rem] p-0 border overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-black/10 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                                <th className="p-5">Member</th><th className="p-5">Status</th><th className="p-5">Type</th><th className="p-5">Joined</th><th className="p-5">Last Active</th><th className="p-5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {filteredMembers.map(member => {
                                                const isArtist = member.isArtist || artists?.some(a => (a.uid === member.id || a.email === member.email) && a.profileStatus === 'approved');
                                                const isCreator = member.isCreator || creators?.some(c => c.uid === member.id || c.email === member.email);
                                                const isTribe = member.hasJoinedTribe;
                                                const typeLabel = isArtist ? 'Artist' : isCreator ? 'Creator' : isTribe ? 'Tribe' : member.isTicketHolder ? 'Ticket' : member.isSubscriber ? 'Sub' : 'Member';
                                                const typeStyle = isArtist ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20 text-[#FF6B6B]' : isCreator ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink' : isTribe ? 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/5 text-gray-500';
                                                const avatarStyle = member.isBlocked ? 'bg-red-500/10 border-red-500/20 text-red-500' : isArtist ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/30 text-[#FF6B6B]' : isCreator ? 'bg-neon-pink/10 border-neon-pink/30 text-neon-pink' : isTribe ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-700 dark:text-white/60';
                                                return (
                                                    <tr key={member.id} className="group hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black italic border shrink-0 select-none", avatarStyle)}>{(member.displayName || member.email || 'U').slice(0, 2).toUpperCase()}</div>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white group-hover:text-neon-green transition-colors truncate max-w-[180px]">{member.displayName || 'UNNAMED'}</div>
                                                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-[220px]">{member.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            {member.isBlocked
                                                                ? <span className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[8px] font-black uppercase tracking-wider">SUSPENDED</span>
                                                                : <span className="px-2 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-lg text-[8px] font-black uppercase tracking-wider">ACTIVE</span>
                                                            }
                                                        </td>
                                                        <td className="p-5"><span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border", typeStyle)}>{typeLabel}</span></td>
                                                        <td className="p-5"><div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</div></td>
                                                        <td className="p-5">{member.lastActive ? <div className="text-[10px] font-bold text-neon-blue/70 uppercase tracking-widest">{new Date(member.lastActive).toLocaleDateString(undefined, { dateStyle: 'short' })}</div> : <div className="text-gray-600 italic text-[10px]">—</div>}</td>
                                                        <td className="p-5">
                                                            <div className="flex justify-end gap-1.5">
                                                                {member.isBlocked
                                                                    ? <button onClick={() => handleUnblockUser(member)} className="px-3 h-8 bg-neon-green/10 hover:bg-neon-green text-neon-green hover:text-black border border-neon-green/20 hover:border-transparent rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1"><CheckCircle size={10} /> Reinstate</button>
                                                                    : <>
                                                                        <button onClick={() => handleBlockUser(member)} className="px-3 h-8 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/10 hover:border-transparent rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1"><ShieldAlert size={10} /> Suspend</button>
                                                                        <button onClick={() => handleRevokeMemberSessions(member)} className="px-3 h-8 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 border border-black/10 dark:border-white/5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1"><LogOut size={10} /> Logout</button>
                                                                    </>
                                                                }
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

                        {/* Pagination */}
                        {!membersLoading && totalPages && totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-6">
                                <button disabled={membersPage === 1} onClick={() => handlePageChange(membersPage - 1)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-white disabled:opacity-30 hover:bg-white dark:hover:bg-white/10 transition-all">
                                    <ChevronLeft size={16} />
                                </button>
                                {(() => {
                                    const pages = [];
                                    const maxVisible = 7;
                                    const half = Math.floor(maxVisible / 2);
                                    let start = Math.max(1, membersPage - half);
                                    let end = Math.min(totalPages, start + maxVisible - 1);
                                    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
                                    if (start > 1) { pages.push(<button key={1} onClick={() => handlePageChange(1)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10 transition-all">1</button>); if (start > 2) pages.push(<span key="d1" className="text-gray-400 text-sm font-bold px-1">…</span>); }
                                    for (let p = start; p <= end; p++) {
                                        pages.push(<button key={p} onClick={() => handlePageChange(p)} className={cn("w-10 h-10 rounded-full text-xs font-black transition-all border", membersPage === p ? "bg-neon-green/20 text-neon-green border-neon-green/30 scale-105" : "bg-gray-100 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10")}>{p}</button>);
                                    }
                                    if (end < totalPages) { if (end < totalPages - 1) pages.push(<span key="d2" className="text-gray-400 text-sm font-bold px-1">…</span>); pages.push(<button key={totalPages} onClick={() => handlePageChange(totalPages)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10 transition-all">{totalPages}</button>); }
                                    return pages;
                                })()}
                                <button disabled={membersPage === totalPages || !hasMore} onClick={() => handlePageChange(membersPage + 1)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-white disabled:opacity-30 hover:bg-white dark:hover:bg-white/10 transition-all">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </motion.div>

                ) : activeTab === 'requests' && canAuthorizeStaff ? (

                    /* PENDING REQUESTS TAB */
                    <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="space-y-6">
                        <div className="relative group max-w-md">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors" size={16} />
                            <input value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="Search pending requests..." className="w-full bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 focus:border-yellow-500/30 h-12 pl-12 pr-10 rounded-2xl text-[11px] font-semibold outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" />
                            {adminSearch && <button onClick={() => setAdminSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"><X size={13} /></button>}
                        </div>
                        {filteredRequests.length === 0 ? (
                            <div className="py-32 bg-gray-100/50 dark:bg-white/[0.01] rounded-[2.5rem] border border-dashed border-black/10 dark:border-white/5 text-center">
                                <Clock size={36} className="mx-auto text-gray-400 mb-4" />
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No pending clearance requests</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {filteredRequests.map(admin => (
                                    <motion.div key={admin.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="group relative has-[.select-open]:z-50">
                                        <div className="absolute inset-0 rounded-[2.5rem] bg-yellow-500/5 blur-xl pointer-events-none" />
                                        <Card className="relative p-7 bg-gray-100 dark:bg-zinc-950/60 border-yellow-500/10 hover:border-yellow-500/25 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-md hover:-translate-y-1 flex flex-col gap-5 border">
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-yellow-500/60 to-amber-500/40 rounded-t-[2.5rem]" />
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0"><Clock size={16} className="text-yellow-500 animate-pulse" /></div>
                                                <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full text-[8px] font-black uppercase tracking-widest">Awaiting Approval</span>
                                            </div>
                                            <div>
                                                <h3 className="font-mono font-bold text-base text-gray-900 dark:text-white break-all">{admin.email}</h3>
                                                <p className="text-[9px] text-yellow-500/60 font-black uppercase tracking-widest mt-1">Requested {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</p>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-black/10 dark:border-white/5 relative z-30">
                                                <button onClick={() => handleRemoveAdmin(admin.id, admin.role)} className="flex-1 h-11 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/10 hover:border-transparent rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5">Deny</button>
                                                <div className="flex-1 relative z-30"><StudioSelect value="" onChange={val => handleApprove(admin.id, val)} options={getAdminRoleOptions('', canManageDevelopers, canManageFounders)} placeholder="APPROVE & ASSIGN ROLE" accentColor="neon-green" className="h-11" /></div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                ) : (

                    /* ADMINS TAB */
                    <motion.div key="admins" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="space-y-8">

                        {/* Invite Panel */}
                        <AnimatePresence>
                            {isInviteOpen && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'clip' }}>
                                    <div className="relative p-0.5 rounded-[2.5rem] bg-gradient-to-r from-neon-green/30 via-neon-blue/20 to-purple-500/30 mb-6">
                                        <Card className="p-8 sm:p-10 bg-white dark:bg-[#0B0F17]/95 border-none rounded-[2.4rem]">
                                            <div className="flex items-center justify-between mb-7 pb-4 border-b border-black/10 dark:border-white/5">
                                                <h2 className="text-base font-heading font-black italic uppercase tracking-tight flex items-center gap-3 text-gray-900 dark:text-white">
                                                    <Shield className="text-neon-green animate-pulse" size={18} /> DISPATCH CREDENTIALS
                                                </h2>
                                                <button onClick={() => setIsInviteOpen(false)} className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-white transition-all"><X size={14} /></button>
                                            </div>
                                            <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                                                <div className="md:col-span-6 space-y-2">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                                                    <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} required placeholder="operative@newbi.live" className="w-full h-12 bg-gray-100 dark:bg-black/40 border border-black/10 dark:border-white/5 focus:border-neon-green/30 rounded-2xl px-5 text-xs font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" />
                                                </div>
                                                <div className="md:col-span-4 space-y-2 relative z-30">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Clearance Level</label>
                                                    <StudioSelect value={newAdminRole} onChange={val => setNewAdminRole(val)} options={getAdminRoleOptions('', canManageDevelopers, canManageFounders)} accentColor="neon-green" className="h-12" />
                                                </div>
                                                <button type="submit" className="md:col-span-2 w-full h-12 bg-neon-green text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_8px_20px_rgba(57,255,20,0.2)] flex items-center justify-center gap-2">
                                                    <UserPlus size={13} /> Dispatch
                                                </button>
                                            </form>
                                        </Card>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Inline pending block in Admins tab */}
                        {canAuthorizeStaff && admins.filter(a => a.role === 'pending').length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] flex items-center gap-2 italic"><Clock size={13} className="animate-pulse" /> Pending Credential Dispatches</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {admins.filter(a => a.role === 'pending').map(admin => (
                                        <Card key={admin.id} className="p-5 bg-yellow-500/[0.02] border border-yellow-500/15 hover:border-yellow-500/30 rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 backdrop-blur-md relative z-30">
                                            <div className="min-w-0 flex-1"><h4 className="font-mono text-sm font-bold text-gray-900 dark:text-white truncate">{admin.email}</h4><p className="text-[8px] font-black text-yellow-500/50 uppercase tracking-widest mt-1 italic">Waiting for verification</p></div>
                                            <div className="flex gap-3 shrink-0 w-full sm:w-auto">
                                                <button onClick={() => handleRemoveAdmin(admin.id, admin.role)} className="px-4 h-10 rounded-xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-transparent transition-all">Deny</button>
                                                <div className="flex-1 relative z-30"><StudioSelect value="" onChange={val => handleApprove(admin.id, val)} options={getAdminRoleOptions('', canManageDevelopers, canManageFounders)} placeholder="APPROVE" accentColor="neon-green" className="h-10" /></div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Admin search + filter */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-green transition-colors" size={16} />
                                <input value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="Search command staff..." className="w-full bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 focus:border-neon-green/30 h-12 pl-12 pr-10 rounded-2xl text-[11px] font-semibold outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" />
                                {adminSearch && <button onClick={() => setAdminSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"><X size={13} /></button>}
                            </div>
                            <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 rounded-2xl overflow-x-auto no-scrollbar shrink-0">
                                {['all', 'content_admin', 'gate_manager', 'blog_writer', 'super_admin', ...(canManageFounders ? ['founder'] : []), ...(canManageDevelopers ? ['developer'] : [])].map(f => {
                                    const labels = { all: 'All', content_admin: 'Content', gate_manager: 'Ticketing', blog_writer: 'Blog', super_admin: 'Super Admin', founder: 'Founder', developer: 'Dev' };
                                    return <button key={f} onClick={() => setAdminFilter(f)} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap", adminFilter === f ? "bg-neon-green/15 text-neon-green border border-neon-green/25" : "text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent")}>{labels[f] || f}</button>;
                                })}
                            </div>
                        </div>

                        {/* Admin cards */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/5">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                                    <Shield size={13} className="text-neon-green" /> Active Command Staff — {filteredAdmins.length} operative{filteredAdmins.length !== 1 ? 's' : ''}
                                </h3>
                            </div>
                            {loadingAdmins
                                ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
                                : filteredAdmins.length === 0
                                    ? <div className="py-20 text-center bg-gray-100/50 dark:bg-white/[0.01] border border-dashed border-black/10 dark:border-white/5 rounded-[2rem]"><Users size={28} className="mx-auto text-gray-400 mb-3" /><p className="text-xs font-black text-gray-500 uppercase tracking-widest">No matching command staff found</p></div>
                                    : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                        {filteredAdmins.map(admin => {
                                            const isSelf = admin.email === user.email;
                                            const roleColors = {
                                                developer: { text: 'text-gray-900 dark:text-white', border: 'border-black/20 dark:border-white/20', bg: 'bg-black/5 dark:bg-white/5', name: 'Developer', bar: 'from-gray-400 to-zinc-500' },
                                                founder: { text: 'text-[#FFD700]', border: 'border-[#FFD700]/20', bg: 'bg-[#FFD700]/5', name: 'Founder', bar: 'from-[#FFD700] to-amber-500' },
                                                super_admin: { text: 'text-neon-pink', border: 'border-neon-pink/20', bg: 'bg-neon-pink/5', name: 'Super Admin', bar: 'from-neon-pink to-purple-500' },
                                                content_admin: { text: 'text-neon-green', border: 'border-neon-green/20', bg: 'bg-neon-green/5', name: 'Content Admin', bar: 'from-neon-green to-emerald-500' },
                                                gate_manager: { text: 'text-yellow-500', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', name: 'Ticketing Admin', bar: 'from-yellow-500 to-orange-500' },
                                                blog_writer: { text: 'text-neon-blue', border: 'border-neon-blue/20', bg: 'bg-neon-blue/5', name: 'Blog Writer', bar: 'from-neon-blue to-indigo-500' },
                                                editor: { text: 'text-neon-green', border: 'border-neon-green/20', bg: 'bg-neon-green/5', name: 'Content Admin', bar: 'from-neon-green to-emerald-500' },
                                                scanner: { text: 'text-yellow-500', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', name: 'Ticketing Admin', bar: 'from-yellow-500 to-orange-500' },
                                            };
                                            const rs = roleColors[admin.role] || { text: 'text-gray-500', border: 'border-black/10 dark:border-white/5', bg: 'bg-black/5 dark:bg-white/5', name: admin.role, bar: 'from-gray-400 to-gray-600' };
                                            return (
                                                <motion.div key={admin.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="group relative has-[.select-open]:z-50">
                                                    <Card className="relative p-7 bg-gray-100 dark:bg-zinc-950/60 group-hover:bg-gray-50 dark:group-hover:bg-zinc-900/50 border-black/10 dark:border-white/5 hover:border-black/15 dark:hover:border-white/10 backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 shadow-md hover:shadow-xl flex flex-col gap-5 border hover:-translate-y-1 min-h-[300px]">
                                                        <div className={cn("absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r rounded-t-[2.5rem]", rs.bar)} />
                                                        <div className="flex justify-between items-start">
                                                            <span className={cn("px-2.5 py-1 rounded-full border font-black uppercase tracking-widest text-[8px]", rs.bg, rs.border, rs.text)}>{rs.name}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                {isSelf && <span className="px-2 py-0.5 bg-white dark:bg-white/10 text-black dark:text-white border border-black/10 dark:border-white/10 rounded-md text-[7px] font-black uppercase tracking-widest">You</span>}
                                                                <span className="px-2.5 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[8px] font-black uppercase tracking-widest">ACTIVE</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-heading font-black text-xl sm:text-2xl text-gray-900 dark:text-white group-hover:text-neon-green transition-colors uppercase italic tracking-tighter leading-tight line-clamp-2">{admin.displayName || 'UNIDENTIFIED OPERATIVE'}</h3>
                                                            <p className="text-[10px] text-gray-500 font-mono mt-1 break-all select-all">{admin.email}</p>
                                                        </div>
                                                        <div className="space-y-1.5 relative z-30">
                                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Clearance Level</p>
                                                            {canEditRoles()
                                                                ? <StudioSelect value={admin.role} onChange={val => handleUpdateRole(admin.id, val)} options={getAdminRoleOptions(admin.role, canManageDevelopers, canManageFounders)} disabled={isSelf} accentColor={getSelectAccentColor(admin.role)} className="h-11" />
                                                                : <span className={cn("px-3 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border inline-flex items-center justify-center w-full", rs.bg, rs.border, rs.text)}>{rs.name}</span>
                                                            }
                                                        </div>
                                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-wide">Dispatched: <span className="font-mono text-gray-600 dark:text-gray-400">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</span></span>
                                                        <div className="pt-3 border-t border-black/10 dark:border-white/5 flex flex-wrap gap-2">
                                                            {(isSelf || user.role === 'developer') && (
                                                                <button onClick={() => { const n = prompt(`Rename ${admin.email}:`, admin.displayName || ""); if (n !== null && n.trim() !== "") useStore.getState().updateAdminProfile(null, admin.email, { displayName: n }).then(() => fetchAdmins()); }} className="flex-1 h-10 bg-black/5 dark:bg-white/5 hover:bg-neon-blue/10 text-gray-500 hover:text-neon-blue border border-black/10 dark:border-white/5 hover:border-neon-blue/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5">
                                                                    <UserCheck size={11} /> Rename
                                                                </button>
                                                            )}
                                                            {!isSelf && canEditRoles() && (
                                                                <>
                                                                    <button onClick={async () => { if (window.confirm(`Reset credentials for ${admin.email}?`)) { await useStore.getState().resetPassword(admin.email); useStore.getState().addToast("Password reset email sent!", 'success'); } }} className="flex-1 h-10 bg-black/5 dark:bg-white/5 hover:bg-neon-pink/10 text-gray-500 hover:text-neon-pink border border-black/10 dark:border-white/5 hover:border-neon-pink/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"><Shield size={11} /> Reset</button>
                                                                    <button onClick={() => handleRemoveAdmin(admin.id, admin.role)} className="flex-1 h-10 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 border border-black/10 dark:border-white/5 hover:border-red-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"><Trash2 size={11} /> Remove</button>
                                                                </>
                                                            )}
                                                            {!isSelf && (user?.role === 'developer' || user?.role === 'founder') && (
                                                                <button onClick={() => handleRevokeAdminSessions(admin)} className="w-full h-10 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 border border-black/10 dark:border-white/5 hover:border-red-500/15 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"><LogOut size={11} /> Log Out All Devices</button>
                                                            )}
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                            }
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>
        </AdminCommunityHubLayout>
    );
};

export default AdminManager;
