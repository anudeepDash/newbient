import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Shield, Clock, CheckCircle } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../lib/store';

const AdminManager = () => {
    const { user } = useStore();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminRole, setNewAdminRole] = useState('editor');

    const fetchAdmins = async () => {
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
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        try {
            // Check if already exists
            const q = query(collection(db, "admins"), where("email", "==", newAdminEmail));
            const existing = await getDocs(q);
            if (!existing.empty) {
                alert("Admin with this email already exists!");
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
            alert("Admin added to database. \n\nIMPORTANT: They must still 'Sign Up' or be created in Firebase Authentication to log in.");
        } catch (error) {
            console.error("Error adding admin:", error);
            alert("Failed to add admin.");
        }
    };

    const handleApprove = async (id, role) => {
        try {
            await updateDoc(doc(db, "admins", id), { role: role });
            fetchAdmins();
            alert(`User approved as ${role}!`);
        } catch (error) {
            console.error("Error approving admin:", error);
            alert("Failed to approve user.");
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        try {
            await updateDoc(doc(db, "admins", id), { role: newRole });
            fetchAdmins();
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Failed to update role.");
        }
    };

    const handleRemoveAdmin = async (id, targetRole) => {
        if (!canEditRoles(targetRole)) {
            alert("You do not have permission to remove this user.");
            return;
        }

        if (window.confirm('Are you sure you want to remove/deny this user? They will lose access immediately.')) {
            try {
                await deleteDoc(doc(db, "admins", id));
                fetchAdmins();
            } catch (error) {
                console.error("Error removing admin:", error);
                alert("Failed to remove admin.");
            }
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
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
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="text-center">
                    <Shield size={48} className="mx-auto mb-4 text-red-500" />
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-gray-400 mt-2">You do not have permission to view this page.</p>
                    <Link to="/admin" className="text-neon-blue mt-4 inline-block hover:underline">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    const filteredAdmins = displayAdmins.filter(a =>
        a.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">Manage Admins</h1>
                            <p className="text-gray-400 text-xs md:text-sm">Control access and permissions</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsInviteOpen(!isInviteOpen)}
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all w-full md:w-auto ${isInviteOpen ? 'bg-white/10 text-white' : 'bg-neon-blue text-black hover:bg-neon-blue/80 shadow-lg shadow-neon-blue/20'}`}
                    >
                        <UserPlus size={18} />
                        {isInviteOpen ? 'Close Invite' : 'Invite New Admin'}
                    </button>
                </div>

                {/* Invite Form (Collapsible) */}
                {isInviteOpen && (
                    <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
                        <Card className="p-6 border-neon-blue/30 bg-neon-blue/5">
                            <h2 className="text-lg font-bold text-white mb-4">Send Invitation</h2>
                            <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-grow w-full">
                                    <label className="text-xs text-gray-400 mb-1 block">Email Address</label>
                                    <Input
                                        type="email"
                                        placeholder="colleague@newbi.live"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                        required
                                        className="bg-black/50"
                                    />
                                </div>
                                <div className="w-full md:w-64">
                                    <label className="text-xs text-gray-400 mb-1 block">Permission Level</label>
                                    <select
                                        value={newAdminRole}
                                        onChange={(e) => setNewAdminRole(e.target.value)}
                                        className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue appearance-none cursor-pointer"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 1rem center',
                                            backgroundSize: '1.25rem'
                                        }}
                                    >
                                        <option value="editor">Editor (Content Only)</option>
                                        <option value="super_admin">Super Admin (Full Access)</option>
                                        {canManageDevelopers && <option value="developer">Developer Admin (System Overlord)</option>}
                                    </select>
                                </div>
                                <Button type="submit" variant="primary" className="w-full md:w-auto h-12 rounded-lg">
                                    Send Invite
                                </Button>
                            </form>
                            <p className="text-xs text-gray-500 mt-2">
                                * The user must sign up with this email on the login screen to access the account.
                            </p>
                        </Card>
                    </div>
                )}

                {/* Search Bar */}
                <div className="mb-6">
                    <Input
                        placeholder="Search admins by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white/5 border-white/10 focus:border-white/30 max-w-md"
                    />
                </div>

                {/* Pending Requests Section */}
                {admins.filter(a => a.role === 'pending').length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 text-yellow-500">
                            <Clock size={20} />
                            Pending Access Requests
                        </h2>
                        <div className="grid gap-4">
                            {admins.filter(a => a.role === 'pending').map((admin) => (
                                <Card key={admin.id} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-yellow-500/30 bg-yellow-500/5">
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-white">{admin.email}</h3>
                                        <div className="flex gap-2 text-sm mt-1">
                                            <span className="text-gray-400 text-xs">Requested: {new Date(admin.createdAt).toLocaleDateString()}</span>
                                            <span className="text-yellow-500 font-bold uppercase text-[10px] px-2 py-0.5 bg-yellow-500/20 rounded-full">Pending Approval</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            size="sm"
                                            onClick={() => handleRemoveAdmin(admin.id, admin.role)}
                                            className="bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500 hover:text-white"
                                        >
                                            <Trash2 size={16} className="mr-2" /> Deny
                                        </Button>
                                        <div className="flex gap-2 bg-black/30 p-1 rounded-lg border border-white/10">
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(admin.id, 'editor')}
                                                className="bg-neon-green/10 text-neon-green border-transparent hover:bg-neon-green hover:text-black"
                                            >
                                                <CheckCircle size={16} className="mr-2" /> Editor
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(admin.id, 'super_admin')}
                                                className="bg-neon-purple/10 text-neon-purple border-transparent hover:bg-neon-purple hover:text-white"
                                            >
                                                <Shield size={16} className="mr-2" /> Super Admin
                                            </Button>
                                            {canManageDevelopers && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(admin.id, 'developer')}
                                                    className="bg-white/10 text-white border-transparent hover:bg-white hover:text-black"
                                                >
                                                    <Shield size={16} className="mr-2" /> Developer
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Admins List */}
                <Card className="p-0 overflow-hidden border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Shield size={20} className="text-neon-blue" />
                            Current Administrators
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading admins...</div>
                    ) : (
                        <div>
                            {/* Desktop Table Header */}
                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-white/5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <div className="col-span-4">User / Name</div>
                                <div className="col-span-3">Role</div>
                                <div className="col-span-2">Added Date</div>
                                <div className="col-span-3 text-right">Actions</div>
                            </div>

                            {/* List Items */}
                            {filteredAdmins.filter(a => a.role !== 'pending').length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No admins found matching "{searchTerm}"</div>
                            ) : (
                                filteredAdmins.filter(a => a.role !== 'pending').map((admin) => (
                                    <div key={admin.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        {/* Desktop Row */}
                                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                            <div className="col-span-4 font-medium text-white break-words">
                                                <div className="flex flex-col">
                                                    <span>{admin.displayName || 'Unnamed Admin'}</span>
                                                    <span className="text-[10px] text-gray-500">{admin.email}</span>
                                                </div>
                                                {admin.email === user.email && <span className="text-[10px] bg-white/10 px-1 rounded text-gray-400 mt-1 inline-block">(You)</span>}
                                            </div>
                                            <div className="col-span-3">
                                                {canManageDevelopers ? (
                                                    <select
                                                        value={admin.role}
                                                        onChange={(e) => handleUpdateRole(admin.id, e.target.value)}
                                                        disabled={admin.email === user.email}
                                                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-bold uppercase text-neon-green focus:outline-none focus:border-neon-blue w-full"
                                                    >
                                                        <option value="editor">Editor</option>
                                                        <option value="super_admin">Super Admin</option>
                                                        <option value="developer">Developer</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase inline-flex items-center gap-1 ${admin.role === 'super_admin' ? 'bg-neon-pink/10 text-neon-pink' : 'bg-neon-green/10 text-neon-green'
                                                        }`}>
                                                        {admin.role === 'super_admin' && <Shield size={10} />}
                                                        {admin.role === 'developer' && <Shield size={10} className="text-white fill-white" />}
                                                        {admin.role.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="col-span-2 text-sm text-gray-500">
                                                {new Date(admin.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="col-span-3 text-right flex justify-end gap-2">
                                                {(admin.email === user.email || user.role === 'developer') && (
                                                    <button
                                                        onClick={() => {
                                                            const newName = prompt(`Enter new display name for ${admin.email}:`, admin.displayName || "");
                                                            if (newName !== null && newName.trim() !== "") {
                                                                useStore.getState().updateAdminProfile(null, admin.email, { displayName: newName })
                                                                    .then(() => {
                                                                        fetchAdmins();
                                                                        alert("Profile updated!");
                                                                    })
                                                                    .catch(err => alert("Error: " + err.message));
                                                            }
                                                        }}
                                                        className="text-[10px] font-bold text-neon-blue hover:text-white uppercase tracking-widest px-3 py-1 bg-neon-blue/10 border border-neon-blue/20 rounded-lg transition-colors"
                                                    >
                                                        Edit Name
                                                    </button>
                                                )}
                                                {(admin.email !== user.email && canEditRoles(admin.role)) && (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm(`Send password reset email to ${admin.email}?`)) {
                                                                    try {
                                                                        const actionCodeSettings = {
                                                                            url: `${window.location.origin}/auth/action?mode=resetPassword`,
                                                                            handleCodeInApp: true,
                                                                        };
                                                                        await sendPasswordResetEmail(auth, admin.email, actionCodeSettings);
                                                                        alert(`Password reset email sent to ${admin.email}`);
                                                                    } catch (err) {
                                                                        alert("Error: " + err.message);
                                                                    }
                                                                }
                                                            }}
                                                            className="text-gray-500 hover:text-neon-blue transition-colors p-2 rounded hover:bg-white/5"
                                                            title="Send Password Reset Email"
                                                        >
                                                            <Shield size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveAdmin(admin.id, admin.role)}
                                                            className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded hover:bg-white/5"
                                                            title="Revoke Access"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mobile Card View */}
                                        <div className="md:hidden p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-white mb-1">
                                                        {admin.displayName || 'Unnamed Admin'}
                                                        <span className="block text-[10px] text-gray-500 font-normal">{admin.email}</span>
                                                        {admin.email === user.email && <span className="text-[10px] bg-white/10 px-1 rounded text-gray-400 mt-1 inline-block">(You)</span>}
                                                    </div>
                                                    <div className="flex gap-2 text-xs mb-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${admin.role === 'super_admin' ? 'bg-neon-pink/10 text-neon-pink' : 'bg-neon-green/10 text-neon-green'
                                                            }`}>
                                                            {admin.role.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-gray-500 flex items-center">{new Date(admin.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                {(admin.email === user.email || user.role === 'developer') && (
                                                    <button
                                                        onClick={() => {
                                                            const newName = prompt(`Enter new display name for ${admin.email}:`, admin.displayName || "");
                                                            if (newName !== null && newName.trim() !== "") {
                                                                useStore.getState().updateAdminProfile(null, admin.email, { displayName: newName })
                                                                    .then(() => {
                                                                        fetchAdmins();
                                                                        alert("Profile updated!");
                                                                    })
                                                                    .catch(err => alert("Error: " + err.message));
                                                            }
                                                        }}
                                                        className="text-[10px] font-bold text-neon-blue px-3 py-1 bg-neon-blue/10 border border-neon-blue/20 rounded-lg"
                                                    >
                                                        Edit Name
                                                    </button>
                                                )}
                                            </div>
                                            {(admin.email !== user.email && canEditRoles(admin.role)) && (
                                                <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`Send password reset email to ${admin.email}?`)) {
                                                                try {
                                                                    const actionCodeSettings = {
                                                                        url: `${window.location.origin}/auth/action?mode=resetPassword`,
                                                                        handleCodeInApp: true,
                                                                    };
                                                                    await sendPasswordResetEmail(auth, admin.email, actionCodeSettings);
                                                                    alert(`Password reset email sent to ${admin.email}`);
                                                                } catch (err) {
                                                                    alert("Error: " + err.message);
                                                                }
                                                            }
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-neon-blue bg-neon-blue/10 rounded-lg"
                                                        title="Reset Password"
                                                    >
                                                        <Shield size={14} /> Reset Password
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveAdmin(admin.id, admin.role)}
                                                        className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-500 bg-red-500/10 rounded-lg"
                                                    >
                                                        <Trash2 size={14} /> Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AdminManager;
