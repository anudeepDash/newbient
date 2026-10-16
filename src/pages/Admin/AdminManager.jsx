import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Users from 'lucide-react/dist/esm/icons/users';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import UserMinus from 'lucide-react/dist/esm/icons/user-minus';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Activity from 'lucide-react/dist/esm/icons/activity';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import KeyRound from 'lucide-react/dist/esm/icons/key-round';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Lock from 'lucide-react/dist/esm/icons/lock';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { useConsolidatedMembers } from '../../hooks/useConsolidatedMembers';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import GlobalLoader from '../../components/ui/GlobalLoader';
import { sendStaffAuthorizedEmail } from '../../lib/email';
import { exportSubtitle } from '../../lib/xlsx';
import {
    Card, Button, Badge, StatTile, SearchInput, Select, SegmentedTabs, EmptyState,
    Pagination, Avatar, Menu, MenuItem, useViewMode, ViewToggle,
} from '../../components/admin/ui';
import { accent } from '../../components/admin/theme';
import ExportMenu from '../../components/admin/ExportMenu';
import ConfirmSheet from '../../components/admin/workspace/ConfirmSheet';
import AccessNotice from '../../components/admin/workspace/AccessNotice';
import { InviteSheet, RoleSheet, RenameSheet, TeamMemberSheet } from '../../components/admin/workspace/TeamSheets';
import MemberSheet, { MemberTags, memberTags } from '../../components/admin/workspace/MemberSheet';
import { RoleBadge, assignableRoles, roleInfo, TOP_ROLES } from '../../components/admin/workspace/roles';
import { toDate, formatDay, relativeTime } from '../../components/admin/workspace/format';

/*
 * Members: the team (roles and access), access requests, who has been active,
 * and everyone with an account. Tabs live in the URL (?tab=admins|requests|
 * active|members) so the dashboard can link straight to each one.
 */

const PAGE_SIZE = 24;
const TABS = ['admins', 'requests', 'active', 'members'];
const ROLE_ORDER = ['founder', 'developer', 'super_admin', 'content_admin', 'editor', 'blog_writer', 'gate_manager', 'scanner', 'admin'];
const DAY = 86400000;
const WINDOWS = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: '7 days' },
    { value: 'month', label: '30 days' },
    { value: 'all', label: 'Everyone' },
];
const MEMBER_FILTERS = [
    { value: 'all', label: 'Everyone' },
    { value: 'accounts', label: 'With an account' },
    { value: 'team', label: 'Team' },
    { value: 'creators', label: 'Creators' },
    { value: 'tribe', label: 'Tribe' },
    { value: 'tickets', label: 'Ticket buyers' },
    { value: 'subscribers', label: 'Newsletter' },
    { value: 'suspended', label: 'Suspended' },
];

// Errors thrown with a message people can read in the sheet that triggered them.
const friendly = (message) => Object.assign(new Error(message), { userMessage: message });

const sameEmail = (a, b) => Boolean(a && b) && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

const windowStart = (win) => {
    if (win === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    if (win === 'week') return Date.now() - 7 * DAY;
    if (win === 'month') return Date.now() - 30 * DAY;
    return null;
};

const SeenDot = ({ date }) => {
    const mins = date ? (Date.now() - date.getTime()) / 60000 : Infinity;
    const tone = mins < 15 ? 'green' : mins < 60 * 24 ? 'teal' : mins < 60 * 24 * 7 ? 'amber' : 'gray';
    return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', accent(tone).dot)} aria-hidden="true" />;
};

const AdminManager = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const user = useStore(s => s.user);
    const authInitialized = useStore(s => s.authInitialized);
    const storeAdmins = useStore(s => s.admins);
    const allUsers = useStore(s => s.allUsers);
    const isSyncingUsers = useStore(s => s.isSyncingUsers);
    const lastAuthUsersSyncedAt = useStore(s => s.lastAuthUsersSyncedAt);
    const syncAuthUsers = useStore(s => s.syncAuthUsers);
    const blockUser = useStore(s => s.blockUser);
    const unblockUser = useStore(s => s.unblockUser);
    const addToast = useStore(s => s.addToast);

    const { members, totalCount, suspendedCount } = useConsolidatedMembers();

    const role = user?.role;
    const canAuthorizeStaff = role === 'developer' || role === 'founder';
    const canEditRoles = canAuthorizeStaff;
    const canSeePage = ['super_admin', 'developer', 'founder', 'content_admin'].includes(role);

    // ── URL state ──
    const rawTab = searchParams.get('tab');
    const tab = TABS.includes(rawTab) && (rawTab !== 'requests' || canAuthorizeStaff) ? rawTab : 'admins';
    const memberFilter = MEMBER_FILTERS.some(f => f.value === searchParams.get('filter')) ? searchParams.get('filter') : 'all';
    const activeWindow = WINDOWS.some(w => w.value === searchParams.get('window')) ? searchParams.get('window') : 'month';
    const setParams = useCallback((patch) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? next.delete(k) : next.set(k, v)));
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [teamView, setTeamView] = useViewMode('team', 'cards');
    const [memberView, setMemberView] = useViewMode('members', 'list');
    useEffect(() => { setSearch(''); setPage(1); }, [tab]);
    useEffect(() => { setPage(1); }, [search, memberFilter, activeWindow, roleFilter]);

    // ── keep the account list fresh (silent sync every 3 minutes, as before) ──
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);
    useEffect(() => {
        const canSync = ['developer', 'founder', 'super_admin', 'content_admin'].includes(role);
        if (!canSync) return undefined;
        const THREE_MINUTES = 3 * 60 * 1000;
        if (Date.now() - (useStore.getState().lastAuthUsersSyncedAt || 0) > THREE_MINUTES) syncAuthUsers({ silent: true }).catch(() => {});
        const interval = setInterval(() => syncAuthUsers({ silent: true }).catch(() => {}), THREE_MINUTES);
        const onVisible = () => {
            if (document.visibilityState === 'visible' && Date.now() - (useStore.getState().lastAuthUsersSyncedAt || 0) > THREE_MINUTES) {
                syncAuthUsers({ silent: true }).catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
    }, [role, syncAuthUsers]);

    // ── team records (live listener via the store; direct read as a fallback) ──
    const [localAdmins, setLocalAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const fetchAdmins = useCallback(async () => {
        setLoadingAdmins(true);
        try {
            const snapshot = await getDocs(collection(db, 'admins'));
            setLocalAdmins(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
        } catch (err) {
            console.error('Error fetching admins:', err);
        } finally {
            setLoadingAdmins(false);
        }
    }, []);
    useEffect(() => { if (user?.uid) fetchAdmins(); }, [user?.uid, fetchAdmins]);

    const admins = useMemo(() => {
        const source = storeAdmins?.length ? storeAdmins : localAdmins;
        // `authUid` is only a real sign-in id when the record has its own uid field;
        // the document id is a Firestore id and must never be used as one.
        return (source || []).map(a => ({ ...a, id: a.id || a.uid, authUid: a.uid && a.uid !== a.id ? a.uid : null }));
    }, [storeAdmins, localAdmins]);

    const pendingRequests = useMemo(() => admins
        .filter(a => a.role === 'pending')
        .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)), [admins]);

    const displayAdmins = useMemo(() => {
        if (role === 'developer' || role === 'founder') return admins;
        if (role === 'super_admin') return admins.filter(a => a.role !== 'developer');
        return admins.filter(a => a.role !== 'developer' && a.role !== 'founder');
    }, [admins, role]);

    const team = useMemo(() => displayAdmins
        .filter(a => a.role !== 'pending')
        .sort((a, b) => {
            const ra = ROLE_ORDER.indexOf(a.role); const rb = ROLE_ORDER.indexOf(b.role);
            return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb) || String(a.displayName || a.email).localeCompare(String(b.displayName || b.email));
        }), [displayAdmins]);

    const founderCount = useMemo(() => admins.filter(a => a.role === 'founder').length, [admins]);
    const isSelf = (a) => sameEmail(a?.email, user?.email);
    const lastFounder = (a) => a?.role === 'founder' && founderCount <= 1;

    // ── everyone, joined with their sign-in account and team role ──
    const enriched = useMemo(() => {
        const byId = new Map();
        const byEmail = new Map();
        (allUsers || []).forEach(u => {
            byId.set(u.id, u);
            if (u.email) byEmail.set(String(u.email).toLowerCase(), u);
        });
        const teamByEmail = new Map();
        admins.forEach(a => { if (a.email && a.role !== 'pending') teamByEmail.set(String(a.email).toLowerCase(), a); });
        return members.map(m => {
            const email = String(m.email || '').toLowerCase();
            const account = byId.get(m.id) || (email ? byEmail.get(email) : null) || null;
            const adm = email ? teamByEmail.get(email) : null;
            return {
                ...m,
                key: m.id || email,
                hasAccount: Boolean(account),
                accountId: account?.id || null,
                lastSeen: account ? toDate(account.lastActive) : null,
                createdAt: m.createdAt || account?.createdAt || null,
                isBlocked: account ? Boolean(account.isBlocked) : Boolean(m.isBlocked),
                teamRole: adm?.role || null,
                displayName: (m.displayName && m.displayName !== 'UNNAMED_MEMBER') ? m.displayName : (account?.displayName || (email ? email.split('@')[0] : '')),
                phone: m.phone || account?.phone || account?.phoneNumber || '',
                photoURL: account?.photoURL || m.photoURL || null,
            };
        });
    }, [members, allUsers, admins]);

    const activeThisWeek = useMemo(() => {
        const weekAgo = Date.now() - 7 * DAY;
        return enriched.filter(m => m.hasAccount && m.lastSeen && m.lastSeen.getTime() >= weekAgo).length;
    }, [enriched]);

    // ── filtered lists ──
    const q = search.trim().toLowerCase();
    const matches = (...fields) => !q || fields.some(f => String(f || '').toLowerCase().includes(q));

    const teamRows = useMemo(() => team.filter(a => {
        if (roleFilter !== 'all') {
            if (roleFilter === 'content_admin' && !(a.role === 'content_admin' || a.role === 'editor')) return false;
            if (roleFilter === 'gate_manager' && !(a.role === 'gate_manager' || a.role === 'scanner')) return false;
            if (!['content_admin', 'gate_manager'].includes(roleFilter) && a.role !== roleFilter) return false;
        }
        return matches(a.displayName, a.email, roleInfo(a.role).label);
    }), [team, roleFilter, q]); // eslint-disable-line react-hooks/exhaustive-deps

    const requestRows = useMemo(() => pendingRequests.filter(a => matches(a.displayName, a.email)), [pendingRequests, q]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeRows = useMemo(() => {
        const start = windowStart(activeWindow);
        return enriched
            .filter(m => m.hasAccount)
            .filter(m => start == null || (m.lastSeen && m.lastSeen.getTime() >= start))
            .filter(m => matches(m.displayName, m.email, m.phone))
            .sort((a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0));
    }, [enriched, activeWindow, q]); // eslint-disable-line react-hooks/exhaustive-deps

    const memberRows = useMemo(() => enriched.filter(m => {
        if (memberFilter === 'accounts' && !m.hasAccount) return false;
        if (memberFilter === 'suspended' && !m.isBlocked) return false;
        if (memberFilter === 'team' && !m.teamRole) return false;
        if (memberFilter === 'creators' && !m.isCreator) return false;
        if (memberFilter === 'tribe' && !m.hasJoinedTribe) return false;
        if (memberFilter === 'tickets' && !m.isTicketHolder) return false;
        if (memberFilter === 'subscribers' && !m.isSubscriber) return false;
        return matches(m.displayName, m.email, m.phone, m.id);
    }), [enriched, memberFilter, q]); // eslint-disable-line react-hooks/exhaustive-deps

    const pageOf = (rows) => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const pageCount = (rows) => Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

    // ── sheets ──
    const [inviteOpen, setInviteOpen] = useState(false);
    const [teamSheet, setTeamSheet] = useState({ open: false, admin: null });
    const [roleSheet, setRoleSheet] = useState({ open: false, admin: null, mode: 'change' });
    const [renameSheet, setRenameSheet] = useState({ open: false, admin: null });
    const [memberSheet, setMemberSheet] = useState({ open: false, key: null });
    const [confirm, setConfirm] = useState(null);
    const [signOutToo, setSignOutTooState] = useState(true);
    const signOutTooRef = useRef(true); // read by the remove confirm, which is built before the box is ticked
    const setSignOutToo = (v) => { signOutTooRef.current = v; setSignOutTooState(v); };

    // Keep open sheets showing live data after a save.
    const teamSheetAdmin = teamSheet.admin ? (admins.find(a => a.id === teamSheet.admin.id) || teamSheet.admin) : null;
    const memberSheetMember = memberSheet.key ? enriched.find(m => m.key === memberSheet.key) : null;

    // ── team actions ──
    const handleInvite = async (email, newRole) => {
        if (!canAuthorizeStaff) throw friendly('Only founders and developers can add people to the team.');
        if (TOP_ROLES.includes(newRole) && !canAuthorizeStaff) throw friendly('Only founders and developers can hand out that role.');
        const found = await getDocs(query(collection(db, 'admins'), where('email', '==', email)));
        const existing = found.docs[0] || admins.find(a => sameEmail(a.email, email));
        if (existing) {
            const data = existing.data ? existing.data() : existing;
            if (data.role !== 'pending') throw friendly(`${email} is already on the team as ${roleInfo(data.role).label}.`);
            await updateDoc(doc(db, 'admins', existing.id), { role: newRole, approvedBy: user.email, approvedAt: new Date().toISOString() });
        } else {
            await addDoc(collection(db, 'admins'), {
                email,
                role: newRole,
                addedBy: user.email,
                createdAt: new Date().toISOString(),
            });
        }
        await fetchAdmins();
        const mail = await sendStaffAuthorizedEmail(email, newRole).catch(() => ({ success: false }));
        if (mail?.success) addToast(`${email} added as ${roleInfo(newRole).label}. We've emailed them.`, 'success');
        else addToast(`${email} added as ${roleInfo(newRole).label}. The email didn't go through, so let them know yourself.`, 'warning');
    };

    const handleRoleSave = async (admin, newRole, mode) => {
        if (!canEditRoles) throw friendly('Only founders and developers can change roles.');
        if (mode === 'change' && isSelf(admin)) throw friendly("You can't change your own role. Ask another founder.");
        if (mode === 'change' && lastFounder(admin) && newRole !== 'founder') throw friendly("They're the only founder. Make someone else a founder first.");
        await updateDoc(doc(db, 'admins', admin.id), {
            role: newRole,
            roleUpdatedAt: new Date().toISOString(),
            roleUpdatedBy: user.email,
            ...(mode === 'approve' ? { approvedBy: user.email, approvedAt: new Date().toISOString() } : {}),
        });
        await fetchAdmins();
        const name = admin.displayName || admin.email;
        if (mode === 'approve') {
            const mail = admin.email ? await sendStaffAuthorizedEmail(admin.email, newRole).catch(() => ({ success: false })) : { success: false };
            addToast(mail?.success ? `${name} approved as ${roleInfo(newRole).label}. We've emailed them.` : `${name} approved as ${roleInfo(newRole).label}.`, 'success');
        } else {
            addToast(`${name} is now ${roleInfo(newRole).label}.`, 'success');
        }
    };

    const handleRename = async (admin, displayName) => {
        if (!(isSelf(admin) || canEditRoles)) throw friendly('Only founders and developers can rename teammates.');
        await useStore.getState().updateAdminProfile(null, admin.email, { displayName });
        await fetchAdmins();
        addToast('Name saved.', 'success');
    };

    const askResetPassword = (admin) => setConfirm({
        title: 'Send a password reset?',
        description: `${admin.email} will get an email with a link to set a new password. Their current password keeps working until they change it.`,
        confirmLabel: 'Send reset email',
        busyLabel: 'Sending…',
        tone: 'primary',
        icon: KeyRound,
        onConfirm: async () => {
            try {
                await useStore.getState().resetPassword(admin.email);
            } catch (err) {
                throw friendly(err?.message || "Couldn't send the reset email. Please try again.");
            }
            addToast('Password reset email sent.', 'success');
        },
    });

    const askSignOutAdmin = (admin) => setConfirm({
        title: `Sign ${admin.displayName || admin.email} out everywhere?`,
        description: "Every session on every device ends now. They can sign straight back in, so use Remove from team if they shouldn't.",
        confirmLabel: 'Sign out everywhere',
        busyLabel: 'Signing out…',
        tone: 'warning',
        icon: LogOut,
        onConfirm: async () => {
            try {
                await useStore.getState().revokeSessions(admin.authUid, admin.email);
            } catch (err) {
                throw friendly(err?.message || "Couldn't sign them out. Please try again.");
            }
            addToast(`${admin.displayName || admin.email} has been signed out of all devices.`, 'success');
        },
    });

    const askRemove = (admin) => {
        setSignOutToo(true);
        const blocked = isSelf(admin) ? "You can't remove yourself. Ask another founder." : lastFounder(admin) ? "They're the only founder, so they can't be removed. Make someone else a founder first." : '';
        setConfirm({
            kind: 'remove',
            title: `Remove ${admin.displayName || admin.email} from the team?`,
            description: blocked || `They lose access to the admin straight away. Their account and anything they made stay as they are. You can add them back later.`,
            confirmLabel: 'Remove from team',
            busyLabel: 'Removing…',
            tone: 'danger',
            icon: UserMinus,
            disabled: Boolean(blocked),
            onConfirm: async () => {
                if (!canEditRoles) throw friendly('Only founders and developers can remove people.');
                if (blocked) throw friendly(blocked);
                await deleteDoc(doc(db, 'admins', admin.id));
                await fetchAdmins();
                setTeamSheet(s => ({ ...s, open: false }));
                let note = '';
                if (signOutTooRef.current) {
                    try { await useStore.getState().revokeSessions(admin.authUid, admin.email); } catch (err) { console.error(err); note = " Couldn't sign them out of their devices, but they won't be able to open the admin after a reload."; }
                }
                addToast(`${admin.displayName || admin.email} removed from the team.${note}`, note ? 'warning' : 'success');
            },
        });
    };

    const askDeny = (admin) => setConfirm({
        title: `Turn down ${admin.displayName || admin.email}?`,
        description: "Their request is removed. They won't get admin access, and they can ask again later.",
        confirmLabel: 'Turn down',
        busyLabel: 'Removing…',
        tone: 'danger',
        icon: X,
        onConfirm: async () => {
            if (!canAuthorizeStaff) throw friendly('Only founders and developers can answer access requests.');
            await deleteDoc(doc(db, 'admins', admin.id));
            await fetchAdmins();
            addToast('Request turned down.', 'success');
        },
    });

    // ── member actions ──
    const canModerate = (m) => {
        if (!m?.hasAccount) return false;
        if (sameEmail(m.email, user?.email)) return false;
        if (m.teamRole && !canEditRoles) return false; // only founders/developers act on teammates
        return true;
    };

    const askSuspend = (m) => setConfirm({
        title: `Suspend ${m.displayName || m.email}?`,
        description: "They're signed out right away and can't sign back in until you restore access. Nothing they made is deleted.",
        confirmLabel: 'Suspend',
        busyLabel: 'Suspending…',
        tone: 'danger',
        icon: ShieldAlert,
        onConfirm: async () => {
            if (!canModerate(m)) throw friendly("You can't suspend this account.");
            await blockUser(m.accountId);
            addToast(`${m.displayName || m.email} has been suspended.`, 'success');
        },
    });

    const reinstate = async (m) => {
        try {
            await unblockUser(m.accountId);
            addToast(`Access restored for ${m.displayName || m.email}.`, 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't restore their access. Please try again.", 'error');
        }
    };

    const askSignOutMember = (m) => setConfirm({
        title: `Sign ${m.displayName || m.email} out everywhere?`,
        description: 'Every session on every device ends now. They can sign back in.',
        confirmLabel: 'Sign out everywhere',
        busyLabel: 'Signing out…',
        tone: 'warning',
        icon: LogOut,
        onConfirm: async () => {
            try {
                await useStore.getState().revokeSessions(m.accountId, m.email);
            } catch (err) {
                throw friendly(err?.message || "Couldn't sign them out. Please try again.");
            }
            addToast(`${m.displayName || m.email} has been signed out of all devices.`, 'success');
        },
    });

    const handleSync = async () => {
        try {
            await syncAuthUsers({ silent: false });
            await fetchAdmins();
        } catch (err) {
            console.error('Manual sync error:', err);
        }
    };

    // ── exports ──
    const teamExport = () => ({
        filename: 'newbi_team',
        sheetName: 'Team',
        title: 'Team',
        subtitle: exportSubtitle(teamRows.length, 'person'),
        rows: teamRows,
        columns: [
            { header: 'Name', value: a => a.displayName || '' },
            { header: 'Email', value: a => a.email || '' },
            { header: 'Role', value: a => roleInfo(a.role).label },
            { header: 'Added', type: 'date', value: a => toDate(a.createdAt) },
            { header: 'Added by', value: a => a.addedBy || a.approvedBy || '' },
        ],
    });
    const peopleExport = (rows, name) => () => ({
        filename: `newbi_${name.toLowerCase().replace(/\s+/g, '_')}`,
        sheetName: name,
        title: name,
        subtitle: exportSubtitle(rows.length, 'person'),
        rows,
        columns: [
            { header: 'Name', value: m => m.displayName || '' },
            { header: 'Email', value: m => m.email || '' },
            { header: 'Phone', value: m => m.phone || '' },
            { header: 'Tags', value: m => memberTags(m).map(t => t.label).join(', ') },
            { header: 'Joined', type: 'date', value: m => toDate(m.createdAt) },
            { header: 'Last seen', type: 'datetime', value: m => m.lastSeen || null },
        ],
    });

    // ── access ──
    if (!authInitialized) return <GlobalLoader />;
    if (!canSeePage) {
        return (
            <AccessNotice
                icon={Lock}
                tone="indigo"
                title="Members is for founders and admins"
                actions={<Button as={Link} to="/admin" variant="primary" className="h-12 w-full"><LayoutDashboard size={15} /> Back to the dashboard</Button>}
            >
                Your role can't open the team and member list. Ask a founder if you need something here.
            </AccessNotice>
        );
    }

    const syncLabel = isSyncingUsers ? 'Syncing…' : lastAuthUsersSyncedAt ? `Synced ${relativeTime(lastAuthUsersSyncedAt)}` : 'Not synced yet';
    const syncButton = (
        <Button variant="ghost" onClick={handleSync} disabled={isSyncingUsers} className="h-11 shrink-0" title="Pull new sign-ups from Firebase now">
            <RefreshCw size={14} className={cn(isSyncingUsers && 'animate-spin')} />
            <span className="hidden sm:inline">{syncLabel}</span>
            <span className="sm:hidden">Sync</span>
        </Button>
    );

    const teamMenu = (a) => {
        const self = isSelf(a);
        return (
            <Menu trigger={({ toggle }) => (
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toggle(e); }} aria-label={`Actions for ${a.displayName || a.email}`} className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
            )}>
                <MenuItem icon={Eye} onClick={() => setTeamSheet({ open: true, admin: a })}>Details and access</MenuItem>
                {canEditRoles && !self && <MenuItem icon={ShieldCheck} onClick={() => setRoleSheet({ open: true, admin: a, mode: 'change' })}>Change role</MenuItem>}
                {(self || canEditRoles) && <MenuItem icon={Pencil} onClick={() => setRenameSheet({ open: true, admin: a })}>Change display name</MenuItem>}
                <MenuItem as="a" href={`mailto:${a.email}`} icon={Mail}>Send an email</MenuItem>
                {canEditRoles && !self && <MenuItem icon={KeyRound} onClick={() => askResetPassword(a)}>Send password reset</MenuItem>}
                {canEditRoles && !self && <MenuItem icon={LogOut} onClick={() => askSignOutAdmin(a)}>Sign out of all devices</MenuItem>}
                {canEditRoles && !self && <MenuItem icon={UserMinus} danger onClick={() => askRemove(a)}>Remove from team</MenuItem>}
            </Menu>
        );
    };

    const memberMenu = (m) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toggle(e); }} aria-label={`Actions for ${m.displayName || m.email}`} className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            <MenuItem icon={Eye} onClick={() => setMemberSheet({ open: true, key: m.key })}>Details</MenuItem>
            {m.email && <MenuItem as="a" href={`mailto:${m.email}`} icon={Mail}>Send an email</MenuItem>}
            {canModerate(m) && !m.isBlocked && <MenuItem icon={LogOut} onClick={() => askSignOutMember(m)}>Sign out of all devices</MenuItem>}
            {canModerate(m) && (m.isBlocked
                ? <MenuItem icon={ShieldCheck} onClick={() => reinstate(m)}>Restore access</MenuItem>
                : <MenuItem icon={ShieldAlert} danger onClick={() => askSuspend(m)}>Suspend</MenuItem>)}
        </Menu>
    );

    const tabs = [
        { value: 'admins', label: 'Team', count: team.length, icon: Shield },
        ...(canAuthorizeStaff ? [{ value: 'requests', label: 'Requests', count: pendingRequests.length, highlight: pendingRequests.length > 0, icon: Clock }] : []),
        { value: 'active', label: 'Active users', icon: Activity },
        { value: 'members', label: 'All members', count: totalCount, icon: Users },
    ];

    const peopleList = (rows, { showSeen }) => (
        <Card className="overflow-hidden rounded-2xl">
            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                {pageOf(rows).map(m => (
                    <li key={m.key} className="relative transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                            <Avatar src={m.photoURL} name={m.displayName || m.email} size={40} />
                            <button type="button" onClick={() => setMemberSheet({ open: true, key: m.key })} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="truncate text-[15px] font-bold">{m.displayName || 'No name'}</span>
                                    <MemberTags member={m} max={3} />
                                </span>
                                <span className="mt-0.5 block truncate text-[12.5px] text-gray-500">
                                    {m.email || m.phone || '—'}
                                    {!showSeen && m.createdAt ? <span className="hidden sm:inline"> · joined {formatDay(m.createdAt)}</span> : null}
                                </span>
                            </button>
                            {showSeen && (
                                <span className="hidden shrink-0 items-center gap-2 text-right text-[13px] font-semibold text-gray-600 dark:text-zinc-300 sm:flex">
                                    <SeenDot date={m.lastSeen} />
                                    {m.lastSeen ? relativeTime(m.lastSeen) : 'Never'}
                                </span>
                            )}
                            <div className="relative z-10 flex shrink-0 items-center">{memberMenu(m)}</div>
                        </div>
                        {showSeen && (
                            <p className="flex items-center gap-2 px-4 pb-3 pl-[68px] text-[12px] font-semibold text-gray-500 sm:hidden">
                                <SeenDot date={m.lastSeen} /> {m.lastSeen ? `Seen ${relativeTime(m.lastSeen)}` : 'Never seen'}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
            <Pagination page={page} pageCount={pageCount(rows)} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} total={rows.length} pageSize={PAGE_SIZE} />
        </Card>
    );

    const peopleCards = (rows) => (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pageOf(rows).map(m => (
                    <Card key={m.key} className="relative flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                        <div className="flex items-start gap-3">
                            <Avatar src={m.photoURL} name={m.displayName || m.email} size={44} />
                            <button type="button" onClick={() => setMemberSheet({ open: true, key: m.key })} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                <span className="block truncate text-[15px] font-bold">{m.displayName || 'No name'}</span>
                                <span className="block truncate text-[12.5px] text-gray-500">{m.email || m.phone || '—'}</span>
                            </button>
                            <div className="relative z-10 -mr-1 -mt-1">{memberMenu(m)}</div>
                        </div>
                        <MemberTags member={m} max={4} className="mt-3" />
                        <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3 text-[12px] text-gray-500 dark:border-white/[0.06]">
                            <span>{m.createdAt ? `Joined ${formatDay(m.createdAt)}` : 'Join date unknown'}</span>
                            <span className="flex items-center gap-1.5"><SeenDot date={m.lastSeen} />{m.lastSeen ? relativeTime(m.lastSeen) : m.hasAccount ? 'Never seen' : 'No account'}</span>
                        </div>
                    </Card>
                ))}
            </div>
            {pageCount(rows) > 1 && (
                <Card className="rounded-2xl">
                    <Pagination page={page} pageCount={pageCount(rows)} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} total={rows.length} pageSize={PAGE_SIZE} />
                </Card>
            )}
        </>
    );

    const roleTarget = roleSheet.admin ? (admins.find(a => a.id === roleSheet.admin.id) || roleSheet.admin) : null;

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Members', icon: Shield, description: 'Your team, who can open what, and everyone with an account' }}
            hideTabs
            action={canAuthorizeStaff ? (
                <Button variant="primary" onClick={() => setInviteOpen(true)} className="h-11 w-full sm:w-auto"><UserPlus size={15} /> Invite teammate</Button>
            ) : null}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Shield} tone="indigo" label="Team" value={team.length} hint={`${founderCount} ${founderCount === 1 ? 'founder' : 'founders'}`} active={tab === 'admins'} onClick={() => setParams({ tab: 'admins', filter: null, window: null })} />
                    {canAuthorizeStaff ? (
                        <StatTile icon={Clock} tone={pendingRequests.length ? 'amber' : 'gray'} label="Requests" value={pendingRequests.length} hint={pendingRequests.length ? 'Waiting for you' : 'Nothing waiting'} active={tab === 'requests'} onClick={() => setParams({ tab: 'requests', filter: null, window: null })} />
                    ) : (
                        <StatTile icon={ShieldAlert} tone={suspendedCount ? 'red' : 'gray'} label="Suspended" value={suspendedCount} hint="Accounts on hold" active={tab === 'members' && memberFilter === 'suspended'} onClick={() => setParams({ tab: 'members', filter: 'suspended', window: null })} />
                    )}
                    <StatTile icon={UserCheck} tone="green" label="Active" value={activeThisWeek.toLocaleString('en-IN')} hint="Signed in this week" active={tab === 'active' && activeWindow === 'week'} onClick={() => setParams({ tab: 'active', window: 'week', filter: null })} />
                    <StatTile icon={Users} tone="blue" label="All members" value={totalCount.toLocaleString('en-IN')} hint={suspendedCount ? `${suspendedCount} suspended` : 'Everyone we know'} active={tab === 'members' && memberFilter === 'all'} onClick={() => setParams({ tab: 'members', filter: null, window: null })} />
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={tab} onChange={(v) => setParams({ tab: v, filter: null, window: null })} items={tabs} />
                </div>

                {/* ── Team ── */}
                {tab === 'admins' && (
                    <>
                        {canAuthorizeStaff && pendingRequests.length > 0 && (
                            <button type="button" onClick={() => setParams({ tab: 'requests' })} className={cn('flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left', accent('amber').soft, accent('amber').border)}>
                                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('amber').chip)}><Clock size={18} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[14px] font-bold">{pendingRequests.length} {pendingRequests.length === 1 ? 'person is' : 'people are'} waiting for access</span>
                                    <span className="block truncate text-[12.5px] text-gray-600 dark:text-zinc-400">{pendingRequests.slice(0, 3).map(a => a.displayName || a.email).join(', ')}</span>
                                </span>
                                <span className={cn('flex items-center gap-1 text-[13px] font-bold', accent('amber').text)}>Review <ArrowRight size={14} /></span>
                            </button>
                        )}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <SearchInput value={search} onChange={setSearch} placeholder="Name, email or role" className="lg:w-80" />
                            <div className="flex flex-1 items-center gap-2">
                                <Select value={roleFilter} onChange={setRoleFilter} label="Role" className="flex-1 lg:w-52 lg:flex-none" options={[
                                    { value: 'all', label: 'All roles' },
                                    ...['founder', 'developer', 'super_admin', 'content_admin', 'blog_writer', 'gate_manager']
                                        .filter(r => team.some(a => a.role === r || (r === 'content_admin' && a.role === 'editor') || (r === 'gate_manager' && a.role === 'scanner')))
                                        .map(r => ({ value: r, label: roleInfo(r).label })),
                                ]} />
                                <ExportMenu getSpec={teamExport} />
                                <ViewToggle value={teamView} onChange={setTeamView} />
                            </div>
                        </div>

                        {loadingAdmins && !team.length ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {[0, 1, 2].map(i => <div key={i} className="h-40 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}
                            </div>
                        ) : teamRows.length === 0 ? (
                            <Card className="rounded-2xl">
                                <EmptyState
                                    icon={Shield}
                                    title={team.length ? 'Nobody matches' : 'No teammates yet'}
                                    description={team.length ? 'Try another name or role.' : 'Invite the people who run Newbi with you.'}
                                    action={!team.length && canAuthorizeStaff && <Button variant="primary" onClick={() => setInviteOpen(true)}><UserPlus size={14} /> Invite teammate</Button>}
                                />
                            </Card>
                        ) : teamView === 'cards' ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {teamRows.map(a => {
                                    const info = roleInfo(a.role);
                                    return (
                                        <Card key={a.id} className={cn('relative flex flex-col overflow-hidden rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15')}>
                                            <span className={cn('absolute inset-x-0 top-0 h-1', accent(info.tone).dot)} aria-hidden="true" />
                                            <div className="flex items-start gap-3 pt-1">
                                                <Avatar name={a.displayName || a.email} size={44} />
                                                <button type="button" onClick={() => setTeamSheet({ open: true, admin: a })} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                                    <span className="block truncate text-[15px] font-bold">{a.displayName || a.email.split('@')[0]}</span>
                                                    <span className="block truncate text-[12.5px] text-gray-500">{a.email}</span>
                                                </button>
                                                <div className="relative z-10 -mr-1 -mt-1">{teamMenu(a)}</div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                                <RoleBadge role={a.role} />
                                                {isSelf(a) && <Badge tone="gray">You</Badge>}
                                            </div>
                                            <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-gray-500 dark:text-zinc-400">{info.summary}</p>
                                            <p className="mt-3 border-t border-black/[0.06] pt-3 text-[12px] text-gray-500 dark:border-white/[0.06]">
                                                {a.createdAt ? `Added ${formatDay(a.createdAt)}` : 'Added before records began'}{a.addedBy ? ` by ${a.addedBy.split('@')[0]}` : ''}
                                            </p>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card className="overflow-hidden rounded-2xl">
                                <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                    {teamRows.map(a => (
                                        <li key={a.id} className="relative transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                                            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                                <Avatar name={a.displayName || a.email} size={40} />
                                                <button type="button" onClick={() => setTeamSheet({ open: true, admin: a })} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <span className="truncate text-[15px] font-bold">{a.displayName || a.email.split('@')[0]}</span>
                                                        <RoleBadge role={a.role} />
                                                        {isSelf(a) && <Badge tone="gray">You</Badge>}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-[12.5px] text-gray-500">{a.email}</span>
                                                </button>
                                                <span className="hidden shrink-0 text-[12.5px] text-gray-500 md:block">{a.createdAt ? `Added ${formatDay(a.createdAt)}` : ''}</span>
                                                <div className="relative z-10 shrink-0">{teamMenu(a)}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </>
                )}

                {/* ── Access requests ── */}
                {tab === 'requests' && canAuthorizeStaff && (
                    <>
                        {pendingRequests.length > 3 && <SearchInput value={search} onChange={setSearch} placeholder="Search requests" className="lg:w-80" />}
                        {requestRows.length === 0 ? (
                            <Card className="rounded-2xl">
                                <EmptyState icon={Check} tone="green" title="No requests waiting" description="When someone signs in and asks for admin access, they'll show up here for you to approve or turn down." />
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {requestRows.map(a => (
                                    <Card key={a.id} className="flex flex-col rounded-2xl p-4">
                                        <div className="flex items-start gap-3">
                                            <Avatar name={a.displayName || a.email} size={44} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[15px] font-bold">{a.displayName || a.email.split('@')[0]}</p>
                                                <p className="truncate text-[12.5px] text-gray-500">{a.email}</p>
                                                <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
                                                    <Clock size={12} /> Asked {a.createdAt ? relativeTime(a.createdAt) : 'a while ago'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                            <Button variant="secondary" onClick={() => askDeny(a)} className="h-11 flex-1"><X size={14} /> Turn down</Button>
                                            <Button variant="primary" onClick={() => setRoleSheet({ open: true, admin: a, mode: 'approve' })} className="h-11 flex-1"><Check size={14} /> Approve…</Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── Active users ── */}
                {tab === 'active' && (
                    <>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                                <SegmentedTabs value={activeWindow} onChange={(v) => setParams({ window: v === 'month' ? null : v })} items={WINDOWS} />
                            </div>
                            <div className="flex flex-1 flex-wrap items-center gap-2">
                                <SearchInput value={search} onChange={setSearch} placeholder="Name, email or phone" className="basis-full sm:basis-0 sm:flex-1" />
                                <ExportMenu getSpec={peopleExport(activeRows, 'Active users')} />
                                {syncButton}
                            </div>
                        </div>
                        <p className="text-[13px] text-gray-500">
                            {activeRows.length.toLocaleString('en-IN')} {activeRows.length === 1 ? 'person' : 'people'}
                            {activeWindow === 'all' ? ' with an account, most recent first.' : ` signed in ${activeWindow === 'today' ? 'today' : `in the last ${activeWindow === 'week' ? '7' : '30'} days`}.`}
                        </p>
                        {activeRows.length === 0 ? (
                            <Card className="rounded-2xl">
                                <EmptyState icon={Activity} tone="green" title="Nobody in this window" description={q ? 'Try another search.' : 'Pick a longer time range to see more people.'} action={activeWindow !== 'all' && <Button variant="secondary" onClick={() => setParams({ window: 'all' })}>Show everyone</Button>} />
                            </Card>
                        ) : peopleList(activeRows, { showSeen: true })}
                    </>
                )}

                {/* ── All members ── */}
                {tab === 'members' && (
                    <>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <SearchInput value={search} onChange={setSearch} placeholder="Name, email or phone" className="lg:w-80" />
                            <div className="flex flex-1 flex-wrap items-center gap-2">
                                <Select value={memberFilter} onChange={(v) => setParams({ filter: v === 'all' ? null : v })} label="Show" className="min-w-[10rem] flex-1 lg:w-52 lg:flex-none" options={MEMBER_FILTERS.map(f => ({ ...f, label: f.value === 'suspended' ? `Suspended (${suspendedCount})` : f.label }))} />
                                <ExportMenu getSpec={peopleExport(memberRows, 'Members')} />
                                <ViewToggle value={memberView} onChange={setMemberView} />
                                {syncButton}
                            </div>
                        </div>
                        <p className="text-[13px] text-gray-500">
                            {memberRows.length.toLocaleString('en-IN')} {memberRows.length === 1 ? 'person' : 'people'}
                            {memberFilter === 'all' && !q && totalCount > memberRows.length ? ` loaded · ${totalCount.toLocaleString('en-IN')} sign-in accounts in total` : ''}
                        </p>
                        {memberRows.length === 0 ? (
                            <Card className="rounded-2xl">
                                <EmptyState
                                    icon={Users}
                                    tone="blue"
                                    title={members.length ? 'Nobody matches' : 'No members loaded yet'}
                                    description={members.length ? 'Try another search or filter.' : 'Sync accounts to pull everyone who has signed up.'}
                                    action={members.length
                                        ? (q || memberFilter !== 'all') && <Button variant="secondary" onClick={() => { setSearch(''); setParams({ filter: null }); }}>Clear filters</Button>
                                        : <Button variant="primary" onClick={handleSync} disabled={isSyncingUsers}><RefreshCw size={14} /> Sync accounts</Button>}
                                />
                            </Card>
                        ) : memberView === 'cards' ? peopleCards(memberRows) : peopleList(memberRows, { showSeen: false })}
                    </>
                )}
            </div>

            <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} roles={assignableRoles(role)} onInvite={handleInvite} />

            <TeamMemberSheet
                open={teamSheet.open}
                onClose={() => setTeamSheet(s => ({ ...s, open: false }))}
                admin={teamSheetAdmin}
                isSelf={isSelf(teamSheetAdmin)}
                perms={{ canEditRoles }}
                onChangeRole={() => setRoleSheet({ open: true, admin: teamSheetAdmin, mode: 'change' })}
                onRename={() => setRenameSheet({ open: true, admin: teamSheetAdmin })}
                onResetPassword={() => askResetPassword(teamSheetAdmin)}
                onSignOut={() => askSignOutAdmin(teamSheetAdmin)}
                onRemove={() => askRemove(teamSheetAdmin)}
            />

            <RoleSheet
                open={roleSheet.open}
                onClose={() => setRoleSheet(s => ({ ...s, open: false }))}
                person={roleTarget}
                mode={roleSheet.mode}
                roles={assignableRoles(role, roleSheet.mode === 'change' ? roleTarget?.role : null)}
                blockedReason={roleSheet.mode === 'change' && roleTarget
                    ? (isSelf(roleTarget) ? "You can't change your own role. Ask another founder."
                        : lastFounder(roleTarget) ? "They're the only founder. Make someone else a founder before changing this role." : '')
                    : ''}
                onSave={(newRole) => handleRoleSave(roleTarget, newRole, roleSheet.mode)}
            />

            <RenameSheet
                open={renameSheet.open}
                onClose={() => setRenameSheet(s => ({ ...s, open: false }))}
                person={renameSheet.admin}
                onSave={(name) => handleRename(renameSheet.admin, name)}
            />

            <MemberSheet
                open={memberSheet.open}
                onClose={() => setMemberSheet(s => ({ ...s, open: false }))}
                member={memberSheetMember}
                canModerate={canModerate(memberSheetMember)}
                onSuspend={askSuspend}
                onReinstate={reinstate}
                onSignOut={askSignOutMember}
            />

            <ConfirmSheet
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                title={confirm?.title}
                description={confirm?.description}
                confirmLabel={confirm?.confirmLabel}
                busyLabel={confirm?.busyLabel}
                tone={confirm?.tone}
                icon={confirm?.icon}
                disabled={confirm?.disabled}
                onConfirm={confirm?.onConfirm}
            >
                {confirm?.kind === 'remove' && !confirm.disabled && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.08]">
                        <input type="checkbox" checked={signOutToo} onChange={(e) => setSignOutToo(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-red-600" />
                        <span>
                            <span className="block text-[14px] font-semibold text-gray-900 dark:text-white">Also sign them out of every device now</span>
                            <span className="block text-[12.5px] text-gray-500">Otherwise an open admin tab keeps working until they reload it.</span>
                        </span>
                    </label>
                )}
            </ConfirmSheet>
        </AdminCommunityHubLayout>
    );
};

export default AdminManager;
