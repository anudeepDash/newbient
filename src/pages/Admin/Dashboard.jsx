import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, Users, Calendar, Plus, FileText, Megaphone, Music, Mail, Shield, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminCarousel from '../../components/admin/AdminCarousel';

const Dashboard = () => {
    const { invoices, concerts, announcements, user, checkUserRole, logout } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Create 'admins' doc with 'pending' role
            await addDoc(collection(db, 'admins'), {
                email: user.email,
                role: 'pending',
                addedBy: 'SELF_REGISTRATION',
                createdAt: new Date().toISOString()
            });

            // 3. Force token refresh/role check might happen automatically via onAuthStateChanged, 
            // but we can ensure checkUserRole is called.
            alert("Registration successful! Please wait for approval.");
        } catch (error) {
            console.error(error);
            alert("Registration Failed: " + error.message);
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
                    <h1 className="text-2xl font-bold text-white mb-6 text-center">
                        {isRegistering ? 'Request Admin Access' : 'Admin Login'}
                    </h1>
                    <form onSubmit={isRegistering ? handleSignUp : handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@newbi.live"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <Button type="submit" variant="primary" className="w-full">
                            {isRegistering ? 'Submit Request' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-sm text-gray-400 hover:text-white underline transition-colors"
                        >
                            {isRegistering ? 'Already have an account? Login' : 'Need access? Request an account'}
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    // PENDING APPROVAL STATE
    if (user.role === 'pending') {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <Card className="p-8 w-full max-w-md border-yellow-500/30 shadow-yellow-500/20 text-center">
                    <div className="mb-4 flex justify-center">
                        <Clock size={48} className="text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Approval Pending</h1>
                    <p className="text-gray-400 mb-6">
                        Your account has been created but requires Super Admin approval before you can access the dashboard.
                    </p>

                    <div className="bg-white/5 p-4 rounded mb-6 text-left">
                        <p className="text-sm text-gray-300">
                            <strong>Email:</strong> {user.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            Please contact a Super Admin to approve your request.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={logout} variant="outline" className="flex-1 text-white border-white hover:bg-white hover:text-black">
                            Logout
                        </Button>
                        <Button
                            onClick={() => checkUserRole(user)}
                            variant="primary"
                            className="flex-1 bg-yellow-500/20 text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-black"
                        >
                            Check Status
                        </Button>
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
                    </p>

                    <div className="bg-white/5 p-4 rounded mb-6 text-left">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Troubleshooting</h3>
                        <p className="text-sm text-gray-400 mb-1">Your email:</p>
                        <div className="font-mono text-neon-blue bg-black/50 p-2 rounded mb-3 break-all select-all">
                            {user.email}
                        </div>
                        <p className="text-xs text-gray-500">
                            If you believe this is an error, ask a Super Admin to check the "Manage Admins" page.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={logout} variant="outline" className="flex-1 text-white border-white hover:bg-white hover:text-black">
                            Logout
                        </Button>
                        <Button
                            onClick={() => checkUserRole(user)}
                            variant="primary"
                            className="flex-1 bg-neon-blue/20 text-neon-blue border-neon-blue hover:bg-neon-blue hover:text-black"
                        >
                            Refresh Status
                        </Button>
                    </div>
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="p-5 flex flex-col justify-between h-full bg-white/5 border-white/10 hover:border-white/20 transition-all">
                                <div className={`self-start p-2 rounded-lg bg-black/30 mb-4 ${stat.color}`}>
                                    <stat.icon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</h3>
                                    <p className="text-gray-400 text-xs md:text-sm font-medium">{stat.label}</p>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Quick Actions Carousel */}
                <AdminCarousel title="Quick Actions">
                    <Link to="/admin/invoices" className="group block h-full">
                        <Card className="p-8 h-full border-white/10 hover:border-neon-blue bg-gradient-to-br from-white/5 to-transparent hover:from-neon-blue/10 hover:to-transparent transition-all group-hover:-translate-y-1 duration-300">
                            <div className="p-4 rounded-full bg-neon-blue/10 text-neon-blue mb-6 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Invoices</h3>
                            <p className="text-gray-400 text-sm mb-6 line-clamp-2">Create and track client payments securely.</p>
                            <span className="text-neon-blue text-sm font-bold flex items-center gap-2">
                                Open Manager <span className="text-lg">→</span>
                            </span>
                        </Card>
                    </Link>

                    <Link to="/admin/announcements" className="group block h-full">
                        <Card className="p-8 h-full border-white/10 hover:border-neon-pink bg-gradient-to-br from-white/5 to-transparent hover:from-neon-pink/10 hover:to-transparent transition-all group-hover:-translate-y-1 duration-300">
                            <div className="p-4 rounded-full bg-neon-pink/10 text-neon-pink mb-6 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,0,255,0.2)]">
                                <Megaphone size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Announcements</h3>
                            <p className="text-gray-400 text-sm mb-6 line-clamp-2">Post news updates and pin important info.</p>
                            <span className="text-neon-pink text-sm font-bold flex items-center gap-2">
                                Manage Posts <span className="text-lg">→</span>
                            </span>
                        </Card>
                    </Link>

                    <Link to="/admin/forms" className="group block h-full">
                        <Card className="p-8 h-full border-white/10 hover:border-neon-green bg-gradient-to-br from-white/5 to-transparent hover:from-neon-green/10 hover:to-transparent transition-all group-hover:-translate-y-1 duration-300">
                            <div className="p-4 rounded-full bg-neon-green/10 text-neon-green mb-6 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Community Hub</h3>
                            <p className="text-gray-400 text-sm mb-6 line-clamp-2">Volunteer gigs, forms, and sign-ups.</p>
                            <span className="text-neon-green text-sm font-bold flex items-center gap-2">
                                Enter Hub <span className="text-lg">→</span>
                            </span>
                        </Card>
                    </Link>
                </AdminCarousel>


                {/* Content Management Carousel */}
                <AdminCarousel title="Content Management">
                    <Link to="/admin/concerts" className="group block h-full">
                        <Card className="p-8 h-full border-white/10 hover:border-neon-green bg-gradient-to-br from-white/5 to-transparent hover:from-neon-green/10 hover:to-transparent transition-all group-hover:-translate-y-1 duration-300">
                            <div className="p-4 rounded-full bg-neon-green/10 text-neon-green mb-6 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Music size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Past Events</h3>
                            <p className="text-gray-400 text-sm mb-6">Manage portfolio and past event records.</p>
                            <span className="text-neon-green text-sm font-bold flex items-center gap-2">Manage Past Events →</span>
                        </Card>
                    </Link>

                    <Link to="/admin/upcoming-events" className="group block h-full">
                        <Card className="p-8 h-full border-white/10 hover:border-yellow-400 bg-gradient-to-br from-white/5 to-transparent hover:from-yellow-400/10 hover:to-transparent transition-all group-hover:-translate-y-1 duration-300">
                            <div className="p-4 rounded-full bg-yellow-400/10 text-yellow-400 mb-6 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Calendar size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Upcoming</h3>
                            <p className="text-gray-400 text-sm mb-6">Homepage pinned events.</p>
                            <span className="text-yellow-400 text-sm font-bold flex items-center gap-2">Manage →</span>
                        </Card>
                    </Link>

                    <Link to="/admin/gallery-manager" className="group block h-full">
                        <Card className="p-8 h-full border-white/10 hover:border-neon-pink bg-gradient-to-br from-white/5 to-transparent hover:from-neon-pink/10 hover:to-transparent transition-all group-hover:-translate-y-1 duration-300">
                            <div className="p-4 rounded-full bg-neon-pink/10 text-neon-pink mb-6 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Gallery</h3>
                            <p className="text-gray-400 text-sm mb-6">Photos and media uploads.</p>
                            <span className="text-neon-pink text-sm font-bold flex items-center gap-2">Edit Photos →</span>
                        </Card>
                    </Link>

                    <Link to="/admin/site-content" className="group block h-full">
                        <Card className="p-8 h-full border-white/10 hover:border-white bg-gradient-to-br from-white/5 to-transparent hover:from-white/10 hover:to-transparent transition-all group-hover:-translate-y-1 duration-300">
                            <div className="p-4 rounded-full bg-white/10 text-white mb-6 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Site Info</h3>
                            <p className="text-gray-400 text-sm mb-6">Contact details and footer links.</p>
                            <span className="text-white text-sm font-bold flex items-center gap-2">Update Info →</span>
                        </Card>
                    </Link>
                </AdminCarousel>
            </div>
        </div >
    );
};

export default Dashboard;
