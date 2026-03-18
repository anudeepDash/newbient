import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, UserPlus, Trash2, Shield, Clock, CheckCircle, Sparkles, Users, Search, Mail, ShieldAlert, UserCheck, Activity } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const AdminManager = () => {
    const { user, blockUser, unblockUser, creators } = useStore();
    const [activeTab, setActiveTab] = useState('members');

    // Admin State
    const [admins, setAdmins] = useState([]);
    const pendingRequests = admins.filter(a => a.role === 'pending');
    const [loadingAdmins, setLoadingAdmins] = useState(true);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminRole, setNewAdminRole] = useState('editor');

    // Member State
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

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
        if (activeTab === 'admins' || activeTab === 'requests') fetchAdmins();
        if (activeTab === 'members') fetchMembers();
    }, [activeTab]);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        try {
            const q = query(collection(db, "admins"), where("email", "==", newAdminEmail));
            const existing = await getDocs(q);
            if (!existing.empty) {
                alert("Conflict: Administrator record already exists.");
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
            alert("Authorization recorded. \n\nNote: User must complete registration to activate access.");
        } catch (error) {
            console.error("Error adding admin:", error);
            alert("System error: Failed to authorize user.");
        }
    };

    const handleApprove = async (id, role) => {
        try {
            await updateDoc(doc(db, "admins", id), { role: role });
            fetchAdmins();
            alert(`Authorization updated: Rank set to ${role}.`);
        } catch (error) {
            console.error("Error approving admin:", error);
            alert("System error: Authorization failed.");
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        try {
            await updateDoc(doc(db, "admins", id), { role: newRole });
            fetchAdmins();
        } catch (error) {
            console.error("Error updating role:", error);
            alert("System error: Role update failed.");
        }
    };

    const handleRemoveAdmin = async (id, targetRole) => {
        if (!canEditRoles(targetRole)) {
            alert("Permission denied: Level mismatch.");
            return;
        }

        if (window.confirm('REVOKE ACCESS: Immediate termination of privileges. Proceed?')) {
            try {
                await deleteDoc(doc(db, "admins", id));
                fetchAdmins();
            } catch (error) {
                console.error("Error removing admin:", error);
                alert("System error: Revocation failed.");
            }
        }
    };

    const handleBlockUser = async (member) => {
        if (window.confirm(`RESTRICTION: Suspend all privileges for ${member.email}?`)) {
            try {
                await blockUser(member.id);
                fetchMembers();
            } catch (error) {
                alert("Operation failed: " + error.message);
            }
        }
    };

    const handleUnblockUser = async (member) => {
        if (window.confirm(`REINSTATE: Restore access for ${member.email}?`)) {
            try {
                await unblockUser(member.id);
                fetchMembers();
            } catch (error) {
                alert("Operation failed: " + error.message);
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
        if (user.role === 'super_admin' && (targetRole === 'editor' || targetRole === 'pending')) return true;
        return false;
    };

    if (user?.role !== 'super_admin' && user?.role !== 'developer') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020202]">
                <div className="text-center p-12 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] max-w-md mx-auto">
                    <ShieldAlert size={48} className="mx-auto mb-6 text-red-500" />
                    <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white">ACCESS DENIED</h1>
                    <p className="text-gray-500 mt-4 text-sm font-medium">Insufficient clearance for this directory.</p>
                    <Link to="/admin" className="text-neon-blue mt-8 inline-block font-black uppercase text-[10px] tracking-widest hover:underline">Return to Command Centre</Link>
                </div>
            </div>
        );
    }

    const filteredAdmins = displayAdmins.filter(a =>
        a.email.toLowerCase().includes((memberSearch || '').toLowerCase())
    );

    const filteredMembers = members.filter(m =>
    (m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.displayName?.toLowerCase().includes(memberSearch.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden pb-20">
            {/* Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-6 pt-32 md:pt-32">
                {/* Modern Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-8">
                    <div className="space-y-4 max-w-full">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO COMMAND CENTRE
                        </Link>
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic leading-[1.6] py-10 pr-12 pl-1 overflow-visible whitespace-nowrap">
                            ACCESS <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white px-4">REGISTRY.</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl gap-2 w-full md:w-auto">
                        {[
                            { id: 'members', label: 'Newbi Personnel', count: members.length, icon: Users },
                            { id: 'admins', label: 'Newbi Command Staff', count: admins.filter(a => a.role !== 'pending').length, icon: Shield },
                            { id: 'requests', label: 'Access Requests', count: pendingRequests.length, icon: Clock }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab.id 
                                        ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)]" 
                                        : "text-gray-500 hover:text-white"
                                )}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[8px]",
                                    activeTab === tab.id ? "bg-black/10 text-black" : "bg-white/5 text-gray-500"
                                )}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'members' ? (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="relative flex-1 max-w-2xl group">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={20} />
                                    <input
                                        placeholder="Search Newbi personnel and assets..."
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        className="w-full h-16 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] pl-16 pr-8 text-sm font-medium focus:border-neon-blue/50 outline-none transition-all placeholder:text-gray-700"
                                    />
                                </div>
                            </div>

                            <Card className="overflow-hidden bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem]">
                                {loadingMembers ? (
                                    <div className="p-32 text-center text-gray-500">
                                        <Activity className="animate-spin mx-auto mb-4 text-neon-blue" size={32} />
                                        <p className="text-[10px] font-black uppercase tracking-widest italic">Synchronizing Registry...</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5 border-b border-white/5">
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Subject</th>
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Registration</th>
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Last Vital</th>
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Directives</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredMembers.map(member => (
                                                    <tr key={member.id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-8 py-6">
                                                            <div className="font-bold text-white text-base">{member.displayName || 'UNNAMED_SUBJECT'}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{member.email}</div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                {member.isBlocked ? (
                                                                    <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[8px] font-black uppercase border border-red-500/20">SUSPENDED</span>
                                                                ) : (
                                                                    <span className="px-3 py-1 bg-neon-green/10 text-neon-green rounded-full text-[8px] font-black uppercase border border-neon-green/20">AUTHORIZED</span>
                                                                )}
                                                                {member.hasJoinedTribe && (
                                                                    <span title="TRIBE_AFFILIATE" className="p-1 px-2 bg-neon-blue/10 text-neon-blue rounded-full text-[8px] font-black border border-neon-blue/20">
                                                                        TRIBE
                                                                    </span>
                                                                )}
                                                                {creators?.some(c => c.uid === member.id) && (
                                                                    <span title="CREATOR_CERTIFIED" className="p-1 px-2 bg-neon-pink/10 text-neon-pink rounded-full text-[8px] font-black border border-neon-pink/20">
                                                                        CREATOR
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-xs font-bold text-gray-400">
                                                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            {member.lastActive ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-gray-400">{new Date(member.lastActive).toLocaleDateString()}</span>
                                                                    <span className="text-[8px] text-gray-600 font-mono italic">{new Date(member.lastActive).toLocaleTimeString()}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-700 italic">OFFLINE</span>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            {member.isBlocked ? (
                                                                <button onClick={() => handleUnblockUser(member)} className="text-[10px] font-black uppercase text-neon-green hover:underline tracking-widest decoration-2 underline-offset-4">Reinstate</button>
                                                            ) : (
                                                                <button onClick={() => handleBlockUser(member)} className="text-[10px] font-black uppercase text-red-500 hover:underline tracking-widest decoration-2 underline-offset-4">Suspend</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    ) : activeTab === 'requests' ? (
                        <motion.div
                            key="requests"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {pendingRequests.length === 0 ? (
                                <div className="py-32 bg-white/[0.02] rounded-[3.5rem] border border-dashed border-white/5 text-center">
                                    <Clock size={40} className="mx-auto text-gray-700 mb-4" />
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">No pending access requests</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {pendingRequests.map((admin) => (
                                        <Card key={admin.id} className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-yellow-500/5 border-yellow-500/20 rounded-[2rem] gap-6">
                                            <div>
                                                <h3 className="font-bold text-lg text-white font-mono">{admin.email}</h3>
                                                <p className="text-[8px] font-black text-yellow-500/50 uppercase tracking-widest mt-2 italic">Awaiting authorization — {new Date(admin.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => handleRemoveAdmin(admin.id, admin.role)} className="px-6 py-2.5 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Deny</button>
                                                <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                                                    <button onClick={() => handleApprove(admin.id, 'editor')} className="px-5 py-2 text-[9px] font-black uppercase text-gray-500 hover:text-neon-green hover:bg-white/5 rounded-xl transition-all">Editor</button>
                                                    <button onClick={() => handleApprove(admin.id, 'super_admin')} className="px-5 py-2 text-[9px] font-black uppercase text-gray-500 hover:text-neon-blue hover:bg-white/5 rounded-xl transition-all">Super Admin</button>
                                                    {canManageDevelopers && <button onClick={() => handleApprove(admin.id, 'developer')} className="px-5 py-2 text-[9px] font-black uppercase text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">Architect</button>}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="admins"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="relative flex-1 max-w-2xl group">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={20} />
                                    <input
                                        placeholder="Query authorized staff members..."
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        className="w-full h-16 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] pl-16 pr-8 text-sm font-medium focus:border-neon-blue/50 outline-none transition-all placeholder:text-gray-700"
                                    />
                                </div>
                                <button
                                    onClick={() => setIsInviteOpen(!isInviteOpen)}
                                    className={cn(
                                        "flex items-center gap-4 h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] transition-all",
                                        isInviteOpen ? "bg-white/10 text-white" : "bg-white text-black shadow-2xl hover:scale-105 active:scale-95"
                                    )}
                                >
                                    <UserPlus size={18} />
                                    {isInviteOpen ? 'Close Portal' : 'Authorize New Staff'}
                                </button>
                            </div>

                            <AnimatePresence>
                                {isInviteOpen && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <Card className="p-12 bg-neon-blue/[0.02] border-neon-blue/20 rounded-[3rem]">
                                            <h2 className="text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                                                <Shield className="text-neon-blue" /> INITIALIZE AUTHORIZATION
                                            </h2>
                                            <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-8 items-end">
                                                <div className="flex-grow w-full space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Email Endpoint</label>
                                                    <Input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} required placeholder="operative@newbi.live" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                                </div>
                                                <div className="w-full md:w-80 space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Clearance Level</label>
                                                    <select
                                                        value={newAdminRole}
                                                        onChange={(e) => setNewAdminRole(e.target.value)}
                                                        className="w-full h-14 bg-black/50 border border-white/10 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer outline-none focus:border-neon-blue"
                                                    >
                                                        <option value="editor">Editor (Production Only)</option>
                                                        <option value="super_admin">Controller (Full Ops)</option>
                                                        {canManageDevelopers && <option value="developer">Architect (System Root)</option>}
                                                    </select>
                                                </div>
                                                <Button type="submit" className="w-full md:w-auto h-14 px-12 bg-neon-blue text-black font-black uppercase text-xs rounded-2xl hover:scale-105 transition-all">
                                                    Grant Access
                                                </Button>
                                            </form>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Pending Authorizations */}
                            {admins.filter(a => a.role === 'pending').length > 0 && (
                                <section className="space-y-6">
                                    <h2 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Clock size={14} /> PENDING AUTHORIZATIONS
                                    </h2>
                                    <div className="grid gap-4">
                                        {admins.filter(a => a.role === 'pending').map((admin) => (
                                            <Card key={admin.id} className="p-8 flex flex-col md:flex-row justify-between items-center bg-yellow-500/5 border-yellow-500/20 rounded-[2rem]">
                                                <div>
                                                    <h3 className="font-bold text-lg text-white font-mono">{admin.email}</h3>
                                                    <p className="text-[8px] font-black text-yellow-500/50 uppercase tracking-widest mt-1 italic">Waiting for verification</p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={() => handleRemoveAdmin(admin.id, admin.role)} className="px-6 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Deny</button>
                                                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                                                        <button onClick={() => handleApprove(admin.id, 'editor')} className="px-4 py-2 text-[8px] font-black uppercase text-gray-500 hover:text-neon-green hover:bg-white/5 rounded-xl transition-all">Editor</button>
                                                        <button onClick={() => handleApprove(admin.id, 'super_admin')} className="px-4 py-2 text-[8px] font-black uppercase text-gray-500 hover:text-neon-blue hover:bg-white/5 rounded-xl transition-all">Super</button>
                                                        {canManageDevelopers && <button onClick={() => handleApprove(admin.id, 'developer')} className="px-4 py-2 text-[8px] font-black uppercase text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">Arch</button>}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Registry Table */}
                            <section className="space-y-6">
                                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Shield size={14} /> ACTIVE CLEARANCE REGISTRY
                                </h2>
                                <Card className="overflow-hidden bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem]">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-white/5 border-b border-white/5">
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Subject / Clearance</th>
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Operation Rank</th>
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Authorization Date</th>
                                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Overrides</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredAdmins.filter(a => a.role !== 'pending').map((admin) => (
                                                    <tr key={admin.id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-8 py-6">
                                                            <div className="font-bold text-white flex items-center gap-3 italic tracking-tighter">
                                                                {admin.displayName || 'UNIDENTIFIED_OPERATIVE'}
                                                                {admin.email === user.email && <span className="bg-white text-black px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase not-italic">Self</span>}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{admin.email}</div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            {canManageDevelopers ? (
                                                                <select
                                                                    value={admin.role}
                                                                    onChange={(e) => handleUpdateRole(admin.id, e.target.value)}
                                                                    disabled={admin.email === user.email}
                                                                    className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-[8px] font-black uppercase text-neon-green focus:border-neon-blue outline-none cursor-pointer"
                                                                >
                                                                    <option value="editor">Editor</option>
                                                                    <option value="super_admin">Super Admin</option>
                                                                    <option value="developer">Architect</option>
                                                                </select>
                                                            ) : (
                                                                <span className={cn(
                                                                    "px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                                                    admin.role === 'super_admin' ? "bg-neon-pink/10 text-neon-pink border-neon-pink/20" : "bg-neon-green/10 text-neon-green border-neon-green/20"
                                                                )}>
                                                                    {admin.role.replace('_', ' ')}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6 text-xs font-bold text-gray-500">{new Date(admin.createdAt).toLocaleDateString()}</td>
                                                        <td className="px-8 py-6 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {(admin.email === user.email || user.role === 'developer') && (
                                                                    <button onClick={() => {
                                                                        const newName = prompt(`Modify identity for ${admin.email}:`, admin.displayName || "");
                                                                        if (newName !== null && newName.trim() !== "") {
                                                                            useStore.getState().updateAdminProfile(null, admin.email, { displayName: newName }).then(() => fetchAdmins());
                                                                        }
                                                                    }} className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-neon-blue transition-all" title="Modify Identity"><UserCheck size={16} /></button>
                                                                )}
                                                                {(admin.email !== user.email && canEditRoles(admin.role)) && (
                                                                    <>
                                                                        <button onClick={async () => {
                                                                            if (window.confirm(`Reset credentials for ${admin.email}?`)) {
                                                                                await sendPasswordResetEmail(auth, admin.email);
                                                                                alert("Instructional payload dispatched.");
                                                                            }
                                                                        }} className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-neon-blue transition-all" title="Reset Credentials"><Shield size={16} /></button>
                                                                        <button onClick={() => handleRemoveAdmin(admin.id, admin.role)} className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-red-500 transition-all" title="Terminate Access"><Trash2 size={16} /></button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </section>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminManager;
