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
        { name: 'Guestlists', path: '/admin/guestlists', icon: ListChecks, color: 'text-neon-blue' },
        { name: 'Community Forms', path: '/admin/forms', icon: ClipboardList, color: 'text-neon-pink' },
    ];

    const tabs = customTabs || defaultTabs;

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-16 md:pt-24 pb-20 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={cn("absolute top-0 right-0 w-[50%] h-[50%] rounded-full blur-[120px] animate-pulse", `bg-${accentColor}/5`)} />
                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-6 md:gap-8">
                    <div className="space-y-4 md:space-y-6 w-full md:w-auto">
                        <AdminDashboardLink className="mb-2" />
                        
                        {studioHeader ? (
                            <div className="space-y-1 md:space-y-2">
                                <div className="flex items-center gap-2 md:gap-3">
                                    {studioHeader.logo ? (
                                        <img src={studioHeader.logo} alt="Logo" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
                                    ) : (
                                        studioHeader.icon ? <studioHeader.icon size={12} className={cn(studioHeader.accentClass, "md:w-4 md:h-4")} /> : <Sparkles size={12} className={cn(studioHeader.accentClass, "md:w-4 md:h-4")} />
                                    )}
                                    <span className={cn(studioHeader.accentClass, "text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em]")}>Operations Hub</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl md:text-6xl font-black font-heading tracking-tighter uppercase italic text-white flex flex-wrap items-center gap-x-3 gap-y-1 leading-none">
                                    {studioHeader.title} <span className={studioHeader.accentClass}>{studioHeader.subtitle}.</span>
                                </h1>
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-3xl md:text-6xl font-black font-heading tracking-tighter uppercase italic pr-4 leading-none">
                                    COMMUNITY <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">HUB.</span>
                                </h1>
                                <p className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mt-2">Management & Engagement Systems</p>
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs (Header - Responsive) */}
                    {!hideTabs && (
                        <div className="w-full md:w-auto flex justify-start md:justify-end -mx-4 md:mx-0 px-4 md:px-0">
                            <div className="flex items-center gap-1.5 p-1 md:p-1.5 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl backdrop-blur-xl shrink-0 overflow-x-auto no-scrollbar max-w-full">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = location.pathname === tab.path;
                                    return (
                                        <Link
                                            key={tab.name}
                                            to={tab.comingSoon ? '#' : tab.path}
                                            className={cn(
                                                "flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl transition-all duration-500 group relative shrink-0",
                                                isActive 
                                                    ? "bg-white text-black font-black" 
                                                    : "text-gray-400 hover:text-white hover:bg-white/5",
                                                tab.comingSoon && "opacity-40 cursor-not-allowed pointer-events-none"
                                            )}
                                        >
                                            <Icon size={14} className={cn(isActive ? "text-black" : tab.color || `text-${accentColor}`, "md:size-[16px]")} />
                                            <div className="flex flex-col text-left">
                                                <span className="text-[8px] md:text-[10px] uppercase tracking-widest leading-none">{tab.name}</span>
                                                {tab.comingSoon && <span className="text-[7px] font-black text-gray-500 uppercase tracking-tighter mt-0.5">Soon</span>}
                                            </div>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="admin-hub-active-tab"
                                                    className="absolute inset-0 bg-white rounded-lg md:rounded-xl -z-10"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>

                {/* Content Container */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] md:rounded-[3rem] p-4 sm:p-6 md:p-10 backdrop-blur-3xl min-h-[60vh] shadow-2xl relative">
                    {/* Decorative radial gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    
                    {(title || description || action) && (
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                            {(title || description) && (
                                <div className="flex-1">
                                    {title && <h2 className="text-xl md:text-2xl font-black font-heading text-white uppercase tracking-tight italic">{title}</h2>}
                                    {description && <p className="text-gray-500 text-[10px] md:text-sm mt-1 uppercase font-bold tracking-widest">{description}</p>}
                                </div>
                            )}
                            {action && (
                                <div className="shrink-0 w-full md:w-auto">
                                    {action}
                                </div>
                            )}
                        </div>
                    )}
                    {children}
                </div>

                {/* Footer Return Link */}
                <div className="mt-12 flex justify-center md:justify-end">
                    <Link 
                        to="/admin" 
                        className="group flex items-center gap-4 px-10 py-5 bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.05] rounded-[2rem] transition-all duration-500 shadow-xl"

                    >
                        <LayoutGrid size={16} className="text-neon-blue group-hover:rotate-90 transition-transform duration-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 group-hover:text-white transition-colors">Return to Hub</span>
                    </Link>
                </div>
            </div>
        </div>

    );
};

export default AdminCommunityHubLayout;

