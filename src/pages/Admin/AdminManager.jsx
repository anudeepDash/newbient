import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Shield } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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

    const handleRemoveAdmin = async (id) => {
        if (window.confirm('Are you sure you want to remove this admin? They will lose access immediately.')) {
            try {
                await deleteDoc(doc(db, "admins", id));
                fetchAdmins();
            } catch (error) {
                console.error("Error removing admin:", error);
                alert("Failed to remove admin.");
            }
        }
    };

    if (user?.role !== 'super_admin') {
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

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/admin" className="text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-3xl font-bold text-white">Manage Admins</h1>
                </div>

                {/* Add Admin Form */}
                <Card className="p-6 mb-8 border-neon-blue/30">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <UserPlus size={20} className="text-neon-blue" />
                        Invite New Admin
                    </h2>
                    <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-4">
                        <Input
                            type="email"
                            placeholder="Email Address"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            required
                            className="flex-grow"
                        />
                        <select
                            value={newAdminRole}
                            onChange={(e) => setNewAdminRole(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
                        >
                            <option value="editor">Editor (Content Only)</option>
                            <option value="super_admin">Super Admin (Full Access)</option>
                        </select>
                        <Button type="submit" variant="primary">Add Access</Button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2">
                        Note: Dealing with auth in V1. Adding them here gives them PERMISSION.
                        They still need to create an account with this email/password on the login screen (if registration is open)
                        or you must creating them in the Firebase Console.
                    </p>
                </Card>

                {/* Admin List */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className="text-center text-gray-500">Loading admins...</div>
                    ) : (
                        admins.map((admin) => (
                            <Card key={admin.id} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-white">{admin.email}</h3>
                                    <div className="flex gap-2 text-sm">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${admin.role === 'super_admin' ? 'bg-neon-pink/20 text-neon-pink' : 'bg-neon-green/20 text-neon-green'
                                            }`}>
                                            {admin.role.replace('_', ' ')}
                                        </span>
                                        <span className="text-gray-500">Added: {new Date(admin.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {admin.email !== user.email && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveAdmin(admin.id)}
                                        className="text-red-400 hover:text-red-300 border-red-900/50 hover:bg-red-900/20"
                                    >
                                        <Trash2 size={16} className="mr-2" /> Remove Access
                                    </Button>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminManager;
