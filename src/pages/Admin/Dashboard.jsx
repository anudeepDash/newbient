import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, Users, Calendar, Plus, FileText, Megaphone, Music, Mail, Shield, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminCarousel from '../../components/admin/AdminCarousel';

const Dashboard = () => {
    const { invoices, concerts, announcements, user, checkUserRole, logout, maintenanceState, archivePastEvents } = useStore();
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (user && (user.role === 'super_admin' || user.role === 'developer')) {
            archivePastEvents();
        }
    }, [user, archivePastEvents]);
    const [password, setPassword] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const [isResetting, setIsResetting] = useState(false);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            const actionCodeSettings = {
                url: 'https://newbi.live/auth/action?mode=resetPassword',
                handleCodeInApp: true,
            };
            await sendPasswordResetEmail(auth, email, actionCodeSettings);
            alert("Password reset email sent! Check your inbox.");
            setIsResetting(false);
        } catch (error) {
            console.error(error);
            alert("Failed to send reset email: " + error.message);
        }
    };

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

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user exists in admins collection
            const adminsRef = collection(db, 'admins');
            const q = query(adminsRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // If not, create a new admin doc with 'pending' role
                await addDoc(collection(db, 'admins'), {
                    email: user.email,
                    role: 'pending',
                    addedBy: 'GOOGLE_AUTH',
                    createdAt: new Date().toISOString()
                });
                alert("Google Sign In Successful! Please wait for approval.");
            }
        } catch (error) {
            console.error(error);
            alert("Google Sign In Failed: " + error.message);
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
                        {isResetting ? 'Reset Password' : (isRegistering ? 'Request Admin Access' : 'Admin Login')}
                    </h1>

                    {isResetting ? (
                        <form onSubmit={handleResetPassword} className="space-y-4">
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
                            <Button type="submit" variant="primary" className="w-full">
                                Send Reset Link
                            </Button>
                            <button
                                type="button"
                                onClick={() => setIsResetting(false)}
                                className="w-full text-sm text-gray-400 hover:text-white underline mt-2"
                            >
                                Back to Login
                            </button>
                        </form>
                    ) : (
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

                            {!isRegistering && (
                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsResetting(true)}
                                        className="text-xs text-neon-blue hover:text-white transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                        </form>
                    )}

                    {!isResetting && !isRegistering && (
                        <div className="mt-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-600" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-zinc-900 px-2 text-gray-400">Or continue with</span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                onClick={handleGoogleLogin}
                                variant="outline"
                                className="w-full mt-4 flex items-center justify-center gap-2 border-white/20 text-white hover:bg-white hover:text-black"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Sign in with Google
                            </Button>
                        </div>
                    )}

                    {!isResetting && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-sm text-gray-400 hover:text-white underline transition-colors"
                            >
                                {isRegistering ? 'Already have an account? Login' : 'Need access? Request an account'}
                            </button>
                        </div>
                    )}
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Dashboard</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Logged in as <span className="text-neon-blue font-medium">{user.email}</span>
                            <span className="ml-2 text-[10px] bg-white/10 px-2 py-1 rounded font-black uppercase tracking-widest">{user.role?.replace('_', ' ')}</span>
                        </p>
                    </div>
                    <div className="flex items-center justify-between w-full md:w-auto gap-6 bg-white/5 md:bg-transparent p-4 md:p-0 rounded-2xl border border-white/10 md:border-0">
                        <Link to="/admin/messages" className="relative text-gray-400 hover:text-white transition-all hover:scale-110 active:scale-95">
                            <Mail size={24} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-black animate-bounce">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>
                        <Button variant="outline" onClick={logout} className="border-white/20 hover:bg-white hover:text-black font-bold uppercase text-xs tracking-widest">
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
                {(user.role === 'super_admin' || user.role === 'developer') && (
                    <div className="mb-8 flex flex-col md:flex-row gap-4">
                        <Link to="/admin/manage-admins" className="flex-1">
                            <div className="bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 border border-neon-purple/50 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group h-full">
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
                        {user.role === 'developer' && (
                            <Link to="/admin/dev-settings" className="flex-1">
                                <div className="bg-gradient-to-r from-white/10 to-transparent border border-white/20 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group h-full">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-full text-white">
                                            <Shield size={24} className="fill-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-neon-blue transition-colors">Dev Settings</h3>
                                            <p className="text-sm text-gray-400">Maintenance, killswitches & feature flags.</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400 group-hover:translate-x-1 transition-transform">→</div>
                                </div>
                            </Link>
                        )}
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
                    {/* Invoices */}
                    <MaintenanceCard
                        title="Invoices"
                        description="Create and track client payments securely."
                        icon={FileText}
                        color="neon-blue"
                        link="/admin/invoices"
                        isUnderMaintenance={maintenanceState.features?.invoices}
                    />

                    {/* Announcements */}
                    <MaintenanceCard
                        title="Announcements"
                        description="Post news updates and pin important info."
                        icon={Megaphone}
                        color="neon-pink"
                        link="/admin/announcements"
                        isUnderMaintenance={maintenanceState.features?.announcements}
                    />

                    {/* Forms / Community */}
                    <MaintenanceCard
                        title="Community Hub"
                        description="Volunteer gigs, forms, and sign-ups."
                        icon={Users}
                        color="neon-green"
                        link="/admin/forms?tab=forms"
                        isUnderMaintenance={maintenanceState.features?.forms}
                    />
                </AdminCarousel>

                {/* Content Management Carousel */}
                <AdminCarousel title="Content Management">
                    {/* Concerts Manager */}
                    <MaintenanceCard
                        title="Past Events"
                        description="Manage portfolio and past event records."
                        icon={Music}
                        color="neon-green"
                        link="/admin/concerts"
                        isUnderMaintenance={maintenanceState.features?.concerts}
                    />

                    {/* Upcoming Events */}
                    <MaintenanceCard
                        title="Upcoming"
                        description="Homepage pinned events."
                        icon={Calendar}
                        color="yellow-400"
                        link="/admin/upcoming-events"
                        isUnderMaintenance={maintenanceState.features?.upcoming_events}
                    />

                    {/* Gallery Manager */}
                    <MaintenanceCard
                        title="Gallery"
                        description="Photos and media uploads."
                        icon={Users}
                        color="neon-pink"
                        link="/admin/gallery-manager"
                        isUnderMaintenance={maintenanceState.features?.gallery_manager}
                    />

                    {/* Site Info */}
                    <MaintenanceCard
                        title="Site Info"
                        description="Contact details and footer links."
                        icon={FileText}
                        color="white"
                        link="/admin/site-content"
                        isUnderMaintenance={maintenanceState.features?.site_content}
                    />
                </AdminCarousel>
            </div>
        </div >
    );
};

// Sub-component for maintenance-aware cards
const MaintenanceCard = ({ title, description, icon: Icon, color, link, isUnderMaintenance }) => {
    if (isUnderMaintenance) {
        return (
            <div
                onClick={() => alert(`The ${title} module is currently undergoing maintenance. Please check back later.`)}
                className="group block h-full cursor-not-allowed"
            >
                <Card className="p-8 h-full flex flex-col justify-between border-white/10 opacity-75 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-4 right-4 px-2 py-1 bg-neon-pink/20 border border-neon-pink/40 rounded text-[10px] font-bold text-neon-pink uppercase tracking-widest animate-pulse">
                        Maintenance 🔧
                    </div>
                    <div>
                        <div className="p-4 rounded-full bg-white/5 text-gray-500 mb-6 w-16 h-16 flex items-center justify-center grayscale">
                            <Icon size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-400 mb-2">{title}</h3>
                        <p className="text-gray-500 text-sm mb-6 line-clamp-2 italic">Scheduled update in progress...</p>
                    </div>
                    <span className="text-gray-600 text-sm font-bold flex items-center gap-2">
                        Module Offline <span className="text-lg">×</span>
                    </span>
                </Card>
            </div>
        );
    }

    return (
        <Link to={link} className="group block h-full">
            <Card className={`p-8 h-full flex flex-col justify-between border-white/10 hover:border-${color} bg-gradient-to-br from-white/5 to-transparent hover:from-${color}/10 hover:to-transparent transition-all group-hover:-translate-y-1 duration-300`}>
                <div>
                    <div className={`p-4 rounded-full bg-${color}/10 text-${color} mb-6 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,0,0,0.1)]`}>
                        <Icon size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2">{description}</p>
                </div>
                <span className={`text-${color} text-sm font-bold flex items-center gap-2`}>
                    Open Manager <span className="text-lg">→</span>
                </span>
            </Card>
        </Link>
    );
};

export default Dashboard;
