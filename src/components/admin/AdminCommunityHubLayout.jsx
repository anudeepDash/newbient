import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardList, ListChecks, Sparkles, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminDashboardLink from './AdminDashboardLink';

const AdminCommunityHubLayout = ({ children, title, description, action, studioHeader, hideTabs = false, tabs: customTabs, accentColor = 'neon-green' }) => {
    const location = useLocation();

    const defaultTabs = [
        { name: 'Volunteer Gigs', path: '/admin/volunteer-gigs', icon: Users, color: 'text-neon-green' },
        { name: 'Community Forms', path: '/admin/forms', icon: ClipboardList, color: 'text-neon-pink' },
        { name: 'Guestlists', path: '/admin/guestlists', icon: ListChecks, color: 'text-neon-blue' },
    ];

    const tabs = customTabs || defaultTabs;

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-24 md:pt-32 pb-32 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                    <div className="space-y-6">
                        <AdminDashboardLink className="mb-6" />
                        
                        {studioHeader ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    {studioHeader.icon ? <studioHeader.icon size={16} className={studioHeader.accentClass} /> : <Sparkles size={16} className={studioHeader.accentClass} />}
                                    <span className={cn(studioHeader.accentClass, "text-[10px] font-black uppercase tracking-[0.4em]")}>Operations Hub</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-4 leading-none">
                                    {studioHeader.title} <span className={studioHeader.accentClass}>{studioHeader.subtitle}.</span>
                                </h1>
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic pr-4 leading-none">
                                    COMMUNITY <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">HUB.</span>
                                </h1>
                                <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mt-2">Management & Engagement Systems</p>
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs (Header - Responsive) */}
                    {!hideTabs && (
                        <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl shrink-0 overflow-x-auto no-scrollbar max-w-full">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = location.pathname === tab.path;
                                return (
                                    <Link
                                        key={tab.name}
                                        to={tab.comingSoon ? '#' : tab.path}
                                        className={cn(
                                            "flex items-center gap-3 px-4 md:px-6 py-2.5 md:py-3 rounded-xl transition-all duration-500 group relative shrink-0",
                                            isActive 
                                                ? "bg-white text-black font-black" 
                                                : "text-gray-400 hover:text-white hover:bg-white/5",
                                            tab.comingSoon && "opacity-40 cursor-not-allowed pointer-events-none"
                                        )}
                                    >
                                        <Icon size={16} className={cn(isActive ? "text-black" : tab.color || `text-${accentColor}`)} />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] md:text-[10px] uppercase tracking-widest leading-none">{tab.name}</span>
                                            {tab.comingSoon && <span className="text-[7px] font-black text-gray-500 uppercase tracking-tighter mt-0.5">Coming Soon</span>}
                                        </div>
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
                    )}

                </div>

                {/* Content Container */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[3.5rem] p-6 md:p-12 backdrop-blur-3xl min-h-[60vh] shadow-2xl relative">
                    {/* Decorative radial gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    
                    {(title || description) && (
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                            <div className="flex-1">
                                {title && <h2 className="text-2xl font-black font-heading text-white uppercase tracking-tight italic">{title}</h2>}
                                {description && <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest">{description}</p>}
                            </div>
                            {action && (
                                <div className="shrink-0">
                                    {action}
                                </div>
                            )}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminCommunityHubLayout;

