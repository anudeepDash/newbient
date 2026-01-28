import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, Users, Calendar, Plus, FileText, Megaphone, Music, Mail, Shield } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const Dashboard = () => {
    const { invoices, concerts, announcements, user, checkUserRole, logout } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [showDevTools, setShowDevTools] = useState(false);
    const [devEmail, setDevEmail] = useState('');

    const handleForceAdmin = async () => {
        if (!devEmail) return;
        try {
            // Check if already exists to avoid duplicates
            const q = query(collection(db, 'admins'), where('email', '==', devEmail));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                alert("This user is already an admin!");
                return;
            }

            await addDoc(collection(db, 'admins'), {
                email: devEmail,
                role: 'super_admin',
                addedBy: 'DEV_FORCE_TOOL',
                createdAt: new Date().toISOString()
            });
            alert(`Success! ${devEmail} is now a Super Admin. Please login again.`);
            setDevEmail('');
        } catch (error) {
            console.error("Error forcing admin:", error);
            alert("Failed: " + error.message + "\n\nIf this fails with 'Permission Denied', you must manually add the document in Firebase Console.");
        }
    };

    // Check if system is uninitialized (no admins yet)
    useEffect(() => {
        const checkInit = async () => {
            if (!user) return;
            // Only check if we are logged in but have no role
            if (user.role === 'unauthorized') {
                const snapshot = await getDocs(collection(db, 'admins'));
                if (snapshot.empty) {
                    setIsFirstRun(true);
                }
            }
        };
        checkInit();
    }, [user]);

    const handleClaimOwnership = async () => {
        if (!user) return;
        try {
            await addDoc(collection(db, 'admins'), {
                email: user.email,
                role: 'super_admin',
                addedBy: 'SYSTEM_BOOTSTRAP',
                createdAt: new Date().toISOString()
            });
            alert("Ownership Claimed! You are now the Super Admin. Refreshing profile...");
            checkUserRole(user); // Refresh role
            setIsFirstRun(false);
        } catch (error) {
            console.error("Error claiming ownership:", error);
            alert("Failed to claim ownership.");
        }
    };

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                checkUserRole(currentUser);
            } else {
                checkUserRole(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, [checkUserRole]);

    // Message Count Listener
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "messages"), where("status", "==", "new"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });
        return () => unsubscribe();
    }, [user]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error(error);
            alert("Login Failed: " + error.message);
        }
    };

    const totalRevenue = invoices.reduce((acc, inv) => acc + inv.amount, 0);
    const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;

    const stats = [
        { label: 'Total Invoices', value: invoices.length, icon: FileText, color: 'text-neon-blue' },
        { label: 'Pending Payments', value: pendingInvoices, icon: DollarSign, color: 'text-neon-pink' },
        { label: 'Recent Concert Updates', value: concerts.length, icon: Music, color: 'text-neon-green' },
        { label: 'Latest Announcements', value: announcements.length, icon: Megaphone, color: 'text-yellow-400' },
    ];

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading Security...</div>;
    }






    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 flex-col">
                <Card className="p-8 w-full max-w-md border-neon-pink/30 shadow-neon-pink/20">
                    <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Access</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@newbi.live"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <Button type="submit" variant="primary" className="w-full">Sign In</Button>
                    </form>

                    <div className="mt-8 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setShowDevTools(!showDevTools);
                                if (!devEmail && email) setDevEmail(email);
                            }}
                            className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-2 w-full justify-center"
                        >
                            <Shield size={12} /> Developer Options
                        </button>

                        {showDevTools && (
                            <div className="mt-4 p-4 bg-white/5 rounded border border-white/10">
                                <h4 className="text-sm font-bold text-white mb-2">Force Admin Bootstrap</h4>
                                <p className="text-xs text-gray-400 mb-3">
                                    Use this if the system is not detecting you as an admin and the automatic claim didn't prompt.
                                </p>
                                <div className="flex gap-2 flex-col">
                                    <Input
                                        type="email"
                                        value={devEmail}
                                        onChange={(e) => setDevEmail(e.target.value)}
                                        placeholder="Email to promote"
                                        className="text-sm py-1"
                                    />
                                    <Button onClick={handleForceAdmin} size="sm" variant="outline" className="w-full border-neon-green text-neon-green hover:bg-neon-green hover:text-black">
                                        Make Super Admin
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    if (user.role === 'unauthorized' && !isFirstRun) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <Card className="p-8 w-full max-w-md border-red-500/30 shadow-red-500/20 text-center">
                    <div className="mb-4 flex justify-center">
                        <Shield size={48} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-gray-400 mb-6">
                        You do not have permission to access the admin dashboard.
                        Please contact a Super Admin to request access.
                    </p>
                    <div className="bg-white/5 p-3 rounded mb-6 text-sm text-gray-300 break-all">
                        Logged in as: <span className="text-white font-mono">{user.email}</span>
                    </div>
                    <Button onClick={logout} variant="outline" className="w-full text-white border-white hover:bg-white hover:text-black">
                        Logout
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                        <p className="text-gray-400">
                            Logged in as <span className="text-neon-blue">{user.email}</span>
                            <span className="ml-2 text-xs bg-white/10 px-2 py-1 rounded uppercase tracking-wider">{user.role?.replace('_', ' ')}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/admin/messages" className="relative text-gray-400 hover:text-white transition-colors">
                            <Mail size={24} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-black">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>
                        <Button variant="outline" onClick={logout}>
                            Logout
                        </Button>
                    </div>
                </div>

                {isFirstRun && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-neon-green/20 to-black border border-neon-green rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="text-neon-green" /> System Uninitialized
                            </h2>
                            <p className="text-gray-300 mt-1">
                                No admins found in database. Since you are the first user, you can claim <strong>Super Admin</strong> ownership.
                            </p>
                        </div>
                        <Button onClick={handleClaimOwnership} variant="primary" className="whitespace-nowrap">
                            Claim Super Admin Access
                        </Button>
                    </div>
                )}

                {/* SUPER ADMIN ONLY SECTION */}
                {user.role === 'super_admin' && (
                    <div className="mb-8">
                        <Link to="/admin/manage-admins">
                            <div className="bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 border border-neon-purple/50 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-neon-purple/20 rounded-full text-neon-purple">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-neon-purple transition-colors">Manage Admins</h3>
                                        <p className="text-sm text-gray-400">Add or remove other administrators and editors.</p>
                                    </div>
                                </div>
                                <div className="text-gray-400 group-hover:translate-x-1 transition-transform">→</div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                                    <h3 className={`text-3xl font-bold ${stat.color}`}>{stat.value}</h3>
                                </div>
                                <div className={`p-3 rounded-full bg-white/5 ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Quick Actions / Navigation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Link to="/admin/invoices" className="group">
                        <Card className="p-8 h-full hover:border-neon-blue transition-colors flex flex-col items-center text-center">
                            <div className="p-4 rounded-full bg-neon-blue/10 text-neon-blue mb-4 group-hover:scale-110 transition-transform">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Invoice Management</h3>
                            <p className="text-gray-400 text-sm mb-6">Create, view, and manage client invoices.</p>
                            <Button variant="outline" className="w-full text-neon-blue border-neon-blue hover:bg-neon-blue hover:text-black">Manage Invoices</Button>
                        </Card>
                    </Link>

                    <Link to="/admin/announcements" className="group">
                        <Card className="p-8 h-full hover:border-neon-pink transition-colors flex flex-col items-center text-center">
                            <div className="p-4 rounded-full bg-neon-pink/10 text-neon-pink mb-4 group-hover:scale-110 transition-transform">
                                <Megaphone size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Announcements</h3>
                            <p className="text-gray-400 text-sm mb-6">Post updates and pin important news.</p>
                            <Button variant="outline" className="w-full text-neon-pink border-neon-pink hover:bg-neon-pink hover:text-white">Manage Announcements</Button>
                        </Card>
                    </Link>

                    <Link to="/admin/forms" className="group">
                        <Card className="p-8 h-full hover:border-neon-green transition-colors flex flex-col items-center text-center">
                            <div className="p-4 rounded-full bg-neon-green/10 text-neon-green mb-4 group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Community Hub</h3>
                            <p className="text-gray-400 text-sm mb-6">Manage volunteer gigs, forms, and community lists.</p>
                            <Button variant="outline" className="w-full text-neon-green border-neon-green hover:bg-neon-green hover:text-black">Enter Hub</Button>
                        </Card>
                    </Link>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                    <Link to="/admin/messages" className="group">
                        <Card className="p-8 h-full hover:border-neon-blue transition-colors flex flex-col items-center text-center bg-white/5">
                            <div className="p-4 rounded-full bg-neon-blue/10 text-neon-blue mb-4 group-hover:scale-110 transition-transform">
                                <Mail size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Inbox</h3>
                            <p className="text-gray-400 text-sm mb-6">Read messages from the contact form.</p>
                            <Button variant="outline" className="w-full text-neon-blue border-neon-blue hover:bg-neon-blue hover:text-black">View Messages</Button>
                        </Card>
                    </Link>
                </div>

                <h2 className="text-2xl font-bold text-white mb-6 mt-12">Content Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <Link to="/admin/concerts" className="group">
                        <Card className="p-8 h-full hover:border-neon-green transition-colors flex flex-col items-center text-center bg-white/5">
                            <div className="p-4 rounded-full bg-neon-green/10 text-neon-green mb-4 group-hover:scale-110 transition-transform">
                                <Music size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Events Manager</h3>
                            <p className="text-gray-400 text-sm mb-6">Manage upcoming concerts and past events.</p>
                            <Button variant="outline" className="w-full text-neon-green border-neon-green hover:bg-neon-green hover:text-black">Manage Events</Button>
                        </Card>
                    </Link>
                    <Link to="/admin/site-content" className="group">
                        <Card className="p-8 h-full hover:border-white transition-colors flex flex-col items-center text-center bg-white/5">
                            <div className="p-4 rounded-full bg-white/10 text-white mb-4 group-hover:scale-110 transition-transform">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Site Details</h3>
                            <p className="text-gray-400 text-sm mb-6">Update contact info, social links, and emails.</p>
                            <Button variant="outline" className="w-full text-white border-white hover:bg-white hover:text-black">Edit Site Content</Button>
                        </Card>
                    </Link>

                    <Link to="/admin/gallery-manager" className="group">
                        <Card className="p-8 h-full hover:border-neon-pink transition-colors flex flex-col items-center text-center bg-white/5">
                            <div className="p-4 rounded-full bg-neon-pink/10 text-neon-pink mb-4 group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Gallery Manager</h3>
                            <p className="text-gray-400 text-sm mb-6">Add or remove photos from the media gallery.</p>
                            <Button variant="outline" className="w-full text-neon-pink border-neon-pink hover:bg-neon-pink hover:text-white">Manage Photos</Button>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
