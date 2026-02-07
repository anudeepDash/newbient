import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Power, Monitor, Package, Layout as LayoutIcon, Globe } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const DevSettings = () => {
    const { user, maintenanceState, toggleMaintenanceFeature, toggleGlobalMaintenance } = useStore();
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const isAdmin = user?.role === 'developer' || user?.role === 'super_admin';

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="text-center">
                    <Shield size={48} className="mx-auto mb-4 text-red-500" />
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-gray-400 mt-2">You do not have permission to access these settings.</p>
                    <Link to="/admin" className="text-neon-blue mt-4 inline-block hover:underline">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    const categories = [
        {
            title: "Public Pages",
            icon: Monitor,
            key: "pages",
            developerOnly: true,
            items: [
                { label: "Gallery", id: "gallery" },
                { label: "Concert Zone", id: "concerts" },
                { label: "Contact", id: "contact" },
                { label: "Community Join", id: "community" },
            ]
        },
        {
            title: "Admin Features",
            icon: Package,
            key: "features",
            developerOnly: true,
            items: [
                { label: "Invoices", id: "invoices" },
                { label: "Announcements", id: "announcements" },
                { label: "Messages", id: "messages" },
                { label: "Gallery Manager", id: "gallery_manager" },
                { label: "Forms/Community", id: "forms" },
            ]
        },
        {
            title: "Granular Sections",
            icon: LayoutIcon,
            key: "sections",
            developerOnly: false,
            items: [
                { label: "Home: Upcoming Events", id: "home_upcoming" },
                { label: "Home: Portfolio", id: "home_portfolio" },
            ]
        }
    ].filter(cat => user?.role === 'developer' || !cat.developerOnly);

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Shield className="text-white fill-white" size={32} />
                                Developer Settings
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-gray-400 text-sm italic">Manage sitewide maintenance & feature flags</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${isLocal ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-neon-green/20 text-neon-green border border-neon-green/30'}`}>
                                    {isLocal ? 'Environment: Local' : 'Environment: Production'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Global Maintenance Mode (Developer Only) */}
                {user.role === 'developer' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <Card className={`p-8 border-2 transition-all duration-500 ${maintenanceState.global ? 'border-red-500 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-neon-green/30 bg-neon-green/5'}`}>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${maintenanceState.global ? 'bg-red-500 text-white' : 'bg-neon-green text-black'}`}>
                                        <Globe size={32} />
                                    </div>
                                    <div className="text-center md:text-left">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Global Maintenance</h2>
                                        <p className="text-gray-400 text-sm">Sitewide maintenance mode. Everyone gets redirected to maintenance page.</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={toggleGlobalMaintenance}
                                    variant={maintenanceState.global ? 'danger' : 'primary'}
                                    className={`px-8 py-6 text-sm font-black italic tracking-widest ${maintenanceState.global ? 'animate-pulse' : ''}`}
                                >
                                    {maintenanceState.global ? 'DEACTIVATE MAINTENANCE MODE' : 'ACTIVATE MAINTENANCE MODE'}
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Granular Toggles */}
                <div className="grid gap-8">
                    {categories.map((cat, idx) => (
                        <motion.div
                            key={cat.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <cat.icon size={14} />
                                {cat.title}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {cat.items.map((item) => {
                                    const isUnderMaintenance = maintenanceState[cat.key]?.[item.id];
                                    return (
                                        <Card
                                            key={item.id}
                                            onClick={() => toggleMaintenanceFeature(cat.key, item.id)}
                                            className={`p-4 cursor-pointer group transition-all duration-300 border-white/5 hover:bg-white/5 ${isUnderMaintenance ? 'border-red-500/50 bg-red-500/5' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${isUnderMaintenance ? 'bg-red-500 animate-ping' : 'bg-neon-green'}`} />
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold transition-colors ${isUnderMaintenance ? 'text-red-400' : 'text-white'}`}>
                                                            {item.label}
                                                        </span>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isUnderMaintenance ? 'text-red-500' : 'text-neon-green'}`}>
                                                            {isUnderMaintenance ? 'Status: ON' : 'Status: OFF'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`p-2 rounded-lg transition-colors ${isUnderMaintenance ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-500 group-hover:text-white'}`}>
                                                    <Power size={16} />
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Debug Section */}
                <div className="mt-20 p-4 bg-black/40 border border-white/5 rounded-lg">
                    <h4 className="text-[10px] font-black uppercase text-gray-600 mb-2">Debug Info</h4>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                        <div>
                            <p className="text-gray-500">Hostname: {window.location.hostname}</p>
                            <p className="text-gray-500">Mode: {isLocal ? 'DEVELOPMENT' : 'PRODUCTION'}</p>
                        </div>
                        <div className="text-right">
                            <pre className="text-gray-700 overflow-auto max-h-20">
                                {JSON.stringify(maintenanceState, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Info Text */}
                <p className="mt-8 text-center text-xs text-gray-600 uppercase tracking-widest">
                    ⚠️ Toggles are live. Changes affect the website in real-time.
                </p>
            </div>
        </div>
    );
};

export default DevSettings;
