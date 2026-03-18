import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardList, ListChecks, LayoutDashboard, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const AdminCommunityHubLayout = ({ children, title, description }) => {
    const location = useLocation();

    const tabs = [
        { name: 'Volunteer Gigs', path: '/admin/volunteer-gigs', icon: Users, color: 'text-neon-green' },
        { name: 'Community Forms', path: '/admin/forms', icon: ClipboardList, color: 'text-neon-pink' },
        { name: 'Guestlists', path: '/admin/guestlists', icon: ListChecks, color: 'text-neon-blue' },
    ];

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-16 md:pt-24 pb-20 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="space-y-4">
                        <Link to="/admin" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" />
                            BACK TO COMMAND CENTRE
                        </Link>
                        <div>
                            <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic pr-4">
                                COMMUNITY <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">HUB.</span>
                            </h1>
                            <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mt-2">Management & Engagement Systems</p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = location.pathname === tab.path;
                            return (
                                <Link
                                    key={tab.path}
                                    to={tab.path}
                                    className={cn(
                                        "flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-500 group relative",
                                        isActive 
                                            ? "bg-white text-black font-black" 
                                            : "text-gray-500 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Icon size={18} className={cn(isActive ? "text-black" : tab.color)} />
                                    <span className="text-[10px] uppercase tracking-widest hidden sm:inline">{tab.name}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="admin-hub-active-tab"
                                            className="absolute inset-0 bg-white rounded-xl -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl min-h-[60vh]">
                    <div className="mb-10">
                        <h2 className="text-2xl font-black font-heading text-white uppercase tracking-tight">{title}</h2>
                        <p className="text-gray-500 text-sm mt-1">{description}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminCommunityHubLayout;
