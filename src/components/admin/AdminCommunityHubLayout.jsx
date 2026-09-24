import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Users, ClipboardList, ListChecks, Sparkles, LayoutGrid, FolderOpen, 
    Menu, X, Mail, Compass, TrendingUp, Ticket, LayoutDashboard, Shield, UserCheck,
    Calendar, Radio, FileText, Music, Settings, ChevronRight, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import AdminDashboardLink from './AdminDashboardLink';

const AdminCommunityHubLayout = ({ children, title, description, action, studioHeader, hideTabs = false, tabs: customTabs, accentColor = 'neon-green', hideMobileMenu = false }) => {
    const location = useLocation();
    const { user, maintenanceState, messages } = useStore();
    const cards = maintenanceState?.features || {};
    const unreadCount = messages?.filter(m => m.status === 'new').length || 0;
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    useBodyScrollLock(isMenuOpen);

    const defaultTabs = [
        { name: 'GIGS', path: '/admin/volunteer-gigs', icon: Users, color: 'text-neon-green' },
        { name: 'GUESTLISTS', path: '/admin/guestlists', icon: ListChecks, color: 'text-neon-blue' },
        { name: 'FORMS', path: '/admin/forms', icon: ClipboardList, color: 'text-neon-pink' },
    ];

    const tabs = customTabs || defaultTabs;

    const bgGlowMap = {
        'neon-green': 'bg-neon-green/5',
        'neon-blue': 'bg-neon-blue/5',
        'neon-pink': 'bg-neon-pink/5',
        'neon-purple': 'bg-neon-purple/5',
    };

    const textColorMap = {
        'neon-green': 'text-neon-green',
        'neon-blue': 'text-neon-blue',
        'neon-pink': 'text-neon-pink',
        'neon-purple': 'text-neon-purple',
    };

    const bgGlowClass = bgGlowMap[accentColor] || 'bg-neon-green/5';
    const activeTextClass = textColorMap[accentColor] || 'text-neon-green';

    const colorClassMap = {
        'neon-green': 'text-neon-green',
        'neon-blue': 'text-neon-blue', 
        'neon-pink': 'text-neon-pink',
        'neon-purple': 'text-neon-purple',
        'yellow-400': 'text-yellow-400',
        'white': 'text-white',
        'red-400': 'text-red-400',
    };

    // Grouped layout modules for switcher drawer
    const sections = [
        {
            title: "Finance & Strategic Assets",
            color: "text-neon-green",
            visible: user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer',
            links: [
                { name: "Finance Board", path: "/admin/finance", icon: TrendingUp, color: "neon-green", show: ['developer', 'founder'].includes(user?.role) && !cards.invoices },
                { name: "Invoices", path: "/admin/invoices", icon: FileText, color: "neon-blue", show: ['developer', 'founder'].includes(user?.role) && !cards.invoices },
                { name: "Proposals", path: "/admin/proposals", icon: FolderOpen, color: "neon-green", show: !cards.docs },
                { name: "Contracts", path: "/admin/agreements", icon: ListChecks, color: "neon-purple", show: !cards.docs }
            ]
        },
        {
            title: "Core Content Infrastructure",
            color: "text-neon-pink",
            visible: user?.role !== 'scanner' && user?.role !== 'gate_manager',
            links: [
                { name: "Site Content", path: "/admin/content", icon: LayoutGrid, color: "neon-pink", show: true },
                { name: "Upcoming", path: "/admin/upcoming-events", icon: Calendar, color: "neon-green", show: !cards.upcoming_events },
                { name: "Announcements", path: "/admin/announcements", icon: Radio, color: "neon-pink", show: !cards.blog_announcements },
                { name: "Blog", path: "/admin/blog", icon: FileText, color: "neon-blue", show: !cards.blog_announcements },
                { name: "Portfolio", path: "/admin/concertzone", icon: Music, color: "neon-purple", show: !cards.concerts }
            ]
        },
        {
            title: "Event & Ticketing Operations",
            color: "text-yellow-400",
            visible: true,
            links: [
                { name: "Ticketing Ops", path: "/admin/ticketing", icon: Ticket, color: "neon-green", show: !cards.ticketing },
                { name: "QR Scanner", path: "/admin/scanner", icon: Compass, color: "yellow-400", show: !cards.ticketing }
            ]
        },
        {
            title: "Personnel & Community Ops",
            color: "text-neon-blue",
            visible: user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer',
            links: [
                { name: "Community Hub", path: "/admin/volunteer-gigs", icon: Users, color: "neon-green", show: !cards.community },
                { name: "Creator Studio", path: "/admin/creators", icon: Sparkles, color: "neon-blue", show: !cards.influencer },
                { name: "Creator Settings", path: "/admin/creators/settings", icon: Settings, color: "neon-pink", show: !cards.influencer },
                { name: "Giveaways", path: "/admin/giveaways", icon: Sparkles, color: "neon-purple", show: !cards.giveaways },
                { name: "Artistant", path: "/admin/artistant", icon: Music, color: "neon-blue", show: !cards.artists },
                { name: "Mailing", path: "/admin/mailing", icon: Mail, color: "neon-blue", show: !cards.mailing },
                { name: "Active Users", path: "/admin/active-users", icon: UserCheck, color: "neon-green", show: user?.role !== 'editor' && user?.role !== 'content_admin' && user?.role !== 'blog_writer' && !cards.admins },
                { name: "Members", path: "/admin/manage-admins", icon: Shield, color: "neon-blue", show: user?.role !== 'editor' && user?.role !== 'content_admin' && user?.role !== 'blog_writer' && !cards.admins },
                { name: "System Command", path: "/admin/system-command", icon: Settings, color: "neon-blue", show: ['developer', 'super_admin', 'founder'].includes(user?.role) },
                { name: "Inbox", path: "/admin/messages", icon: Mail, color: "white", show: !cards.messages }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#08090d] text-gray-900 dark:text-white pt-32 md:pt-48 pb-32 relative overflow-x-hidden selection:bg-neon-green selection:text-black font-heading transition-colors duration-300">

            {/* Atmospheric Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute -top-24 left-1/3 w-[600px] h-[350px] bg-neon-green/[0.035] dark:bg-neon-green/[0.025] rounded-full blur-[140px]" />
                <div className="absolute top-1/2 right-10 w-[500px] h-[400px] bg-neon-blue/[0.025] dark:bg-neon-blue/[0.015] rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[300px] bg-neon-pink/[0.02] dark:bg-neon-pink/[0.01] rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 w-full max-w-7xl xl:max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12">
                {/* Header Section */}
                <div className="flex flex-col gap-6 mb-6 md:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {studioHeader ? (
                                <>
                                    {studioHeader.logo ? (
                                        <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white/5 border border-black/10 dark:border-white/10 p-0.5 overflow-hidden flex items-center justify-center shrink-0">
                                            <img src={studioHeader.logo} alt="Logo" className="w-full h-full object-contain" />
                                        </div>
                                    ) : studioHeader.icon ? (
                                        <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0">
                                            <studioHeader.icon size={20} className={studioHeader.accentClass || "text-gray-600 dark:text-gray-400"} />
                                        </div>
                                    ) : null}
                                    <div>
                                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-heading tracking-tight text-gray-950 dark:text-white leading-tight">
                                            {studioHeader.title} <span className={studioHeader.accentClass}>{studioHeader.subtitle}</span>
                                        </h1>
                                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Administrative Portal</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0">
                                        <LayoutGrid size={20} className="text-neon-green" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-heading tracking-tight text-gray-950 dark:text-white leading-tight">
                                            Community Hub
                                        </h1>
                                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Management & Engagement Systems</p>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <AdminDashboardLink className="hidden md:inline-flex" />
                    </div>

                    {/* Navigation Tabs (Underline Style - Desktop) */}
                    {!hideTabs && (
                        <div className="hidden md:flex overflow-x-auto no-scrollbar border-b border-black/[0.08] dark:border-white/[0.08]">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const currentFullPath = location.pathname + location.search;
                                const hasQuery = tab.path.includes('?');
                                const isActive = hasQuery 
                                    ? currentFullPath === tab.path 
                                    : location.pathname === tab.path && !tabs.some(t => t.path.includes('?') && t.path === currentFullPath);
                                return (
                                    <Link
                                        key={tab.name}
                                        to={tab.comingSoon ? '#' : tab.path}
                                        className={cn(
                                            "relative flex items-center gap-2.5 px-5 py-3.5 transition-all duration-300 shrink-0",
                                            isActive 
                                                ? "text-gray-900 dark:text-white" 
                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white",
                                            tab.comingSoon && "opacity-40 cursor-not-allowed pointer-events-none"
                                        )}
                                    >
                                        <Icon size={15} className={cn(
                                            "transition-colors",
                                            isActive ? (tab.color || "text-neon-green") : "text-gray-400 dark:text-gray-500"
                                        )} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.name}</span>
                                        {tab.badge !== undefined && tab.badge !== null && (
                                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-black bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                                                {tab.badge}
                                            </span>
                                        )}
                                        {tab.comingSoon && <span className="px-1.5 py-0.5 rounded text-[7px] font-black text-gray-500 bg-black/5 dark:bg-white/5 uppercase">Soon</span>}
                                        {isActive && (
                                            <motion.div
                                                layoutId="admin-hub-active-tab"
                                                className="absolute -bottom-px left-0 right-0 h-0.5 bg-neon-green"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Content Container */}
                <div className="relative min-h-[60vh]">
                    {(title || description || action) && (
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                            {(title || description) && (
                                <div className="flex-1">
                                    {title && <h2 className="text-lg sm:text-xl font-black font-heading text-gray-900 dark:text-white tracking-tight">{title}</h2>}
                                    {description && <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{description}</p>}
                                </div>
                            )}
                            {action && (
                                <div className="shrink-0 w-full sm:w-auto relative z-20">
                                    {action}
                                </div>
                            )}
                        </div>
                    )}
                    {children}
                </div>

                {/* Footer Return Link */}
                <div className="mt-10 flex justify-center md:justify-end pb-24 md:pb-0">
                    <Link 
                        to="/admin" 
                        className="group flex items-center gap-3 px-6 py-3 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 rounded-2xl transition-all duration-300"
                    >
                        <LayoutGrid size={14} className="text-neon-green group-hover:rotate-90 transition-transform duration-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Return to Dashboard</span>
                    </Link>
                </div>
            </div>

            {/* Mobile Persistent Floating Control Bar */}
            {!hideMobileMenu && (
                <div 
                    className="fixed bottom-6 inset-x-0 mx-auto z-[100] w-[90%] max-w-[420px] h-14 bg-white/90 dark:bg-[#0c0e14]/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.08] rounded-full flex items-center justify-between p-1.5 shadow-lg md:hidden"
                    style={{ bottom: 'max(1.5rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
                >
                <Link
                    to="/admin"
                    className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90"
                    title="Admin Dashboard"
                >
                    <LayoutDashboard size={15} />
                </Link>
                
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex-1 mx-2 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.12] flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 transition-all active:scale-[0.98]"
                >
                    <Compass size={13} className="text-neon-green" />
                    <span>{title || "Quick Jump"}</span>
                    {isMenuOpen ? <X size={11} className="ml-0.5" /> : <Menu size={11} className="ml-0.5" />}
                </button>
                
                <Link
                    to="/admin/messages"
                    className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white relative transition-all active:scale-90"
                    title="Inbox"
                >
                    <Mail size={15} />
                    {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-neon-pink rounded-full shadow-[0_0_6px_rgba(255,79,139,0.6)]" />
                    )}
                </Link>
            </div>
            )}

            {/* Mobile Bottom Sheet Menu (Synced with Dashboard) */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 z-[80] bg-black/20 dark:bg-black/50 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-x-0 bottom-0 z-[90] h-[85vh] bg-white dark:bg-[#0c0e14] border-t border-black/[0.08] dark:border-white/[0.08] rounded-t-[2rem] md:hidden flex flex-col overflow-hidden shadow-2xl"
                        >
                            {/* Handle */}
                            <div className="w-full flex justify-center py-4 shrink-0">
                                <div className="w-10 h-1 bg-black/10 dark:bg-white/10 rounded-full" />
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 pb-24 scrollbar-hide space-y-6">
                                <div className="text-center mt-1 mb-4">
                                    <div className="inline-flex p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] mb-2.5">
                                        <LayoutGrid className="text-neon-green w-4 h-4" />
                                    </div>
                                    <h2 className="text-lg font-black font-heading tracking-tight text-gray-900 dark:text-white leading-none">Navigation</h2>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mt-1">Administrative Portal Modules</p>
                                </div>

                                <div className="space-y-5">
                                    {sections.map((section) => {
                                        if (!section.visible) return null;
                                        const visibleLinks = section.links.filter(l => l.show);
                                        if (visibleLinks.length === 0) return null;

                                        return (
                                            <div key={section.title} className="space-y-2.5">
                                                <div className="flex items-center gap-2 pl-1">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", 
                                                        section.color.replace('text-', 'bg-')
                                                    )} />
                                                    <h4 className={cn("text-[9px] font-black uppercase tracking-widest", section.color)}>
                                                        {section.title}
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {visibleLinks.map((link) => {
                                                        const LinkIcon = link.icon;
                                                        const isActive = location.pathname === link.path;
                                                        return (
                                                            <Link
                                                                key={link.name}
                                                                to={link.path}
                                                                onClick={() => setIsMenuOpen(false)}
                                                                className={cn(
                                                                    "flex flex-col gap-2 p-3 rounded-2xl transition-all duration-200 border",
                                                                    isActive 
                                                                        ? "bg-black text-white dark:bg-white dark:text-black font-black border-transparent"
                                                                        : "bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-black/[0.06] dark:border-white/[0.06]"
                                                                )}
                                                            >
                                                                <LinkIcon size={15} className={isActive ? "" : (colorClassMap[link.color] || 'text-gray-400')} />
                                                                <span className="text-[9px] font-bold uppercase tracking-widest line-clamp-1">{link.name}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>    );
};

export default AdminCommunityHubLayout;
