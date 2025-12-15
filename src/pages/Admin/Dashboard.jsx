import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, Users, Calendar, Plus, FileText, Megaphone, Music, Mail } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const Dashboard = () => {
    const { invoices, concerts, announcements } = useStore();
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('adminAuth') === 'true';
    });
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) return;

        const q = query(collection(db, "messages"), where("status", "==", "new"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [isAuthenticated]);

    const handleLogin = (e) => {
        e.preventDefault();

        // In Development: Allow defaults if env vars are missing
        // In Production: REQUIRE env vars. Defaults will be ignored/undefined if not set.
        const isDev = import.meta.env.DEV;

        const envUsername = import.meta.env.VITE_ADMIN_USERNAME;
        const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;

        // Fallback only in development
        const finalUsername = envUsername || (isDev ? 'admin' : null);
        const finalPassword = envPassword || (isDev ? 'admin123' : null);

        if (!finalUsername || !finalPassword) {
            alert('Security Error: Admin functionality is disabled because environment variables are missing in this production environment.');
            return;
        }

        if (username === finalUsername && password === finalPassword) {
            setIsAuthenticated(true);
            localStorage.setItem('adminAuth', 'true');
        } else {
            alert('Invalid credentials');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('adminAuth');
    };

    const totalRevenue = invoices.reduce((acc, inv) => acc + inv.amount, 0);
    const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;

    const stats = [
        { label: 'Total Invoices', value: invoices.length, icon: FileText, color: 'text-neon-blue' },
        { label: 'Pending Payments', value: pendingInvoices, icon: DollarSign, color: 'text-neon-pink' },
        { label: 'Recent Concert Updates', value: concerts.length, icon: Music, color: 'text-neon-green' },
        { label: 'Latest Announcements', value: announcements.length, icon: Megaphone, color: 'text-yellow-400' },
    ];

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <Card className="p-8 w-full max-w-md border-neon-pink/30 shadow-neon-pink/20">
                    <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Login</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                            />
                        </div>
                        <Button type="submit" variant="primary" className="w-full">Login</Button>
                        <p className="text-xs text-gray-500 text-center mt-4">Contact admin for access</p>
                    </form>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Welcome Back, Admin</h1>
                        <p className="text-gray-400">Manage your empire from here.</p>
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
                        <Button variant="outline" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </div>



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
                            <h3 className="text-xl font-bold text-white mb-2">Forms & Volunteers</h3>
                            <p className="text-gray-400 text-sm mb-6">Manage volunteer forms, RSVPs, and guestlists.</p>
                            <Button variant="outline" className="w-full text-neon-green border-neon-green hover:bg-neon-green hover:text-black">Manage Forms</Button>
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
