import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Users, ClipboardList, ListChecks, Sparkles, LayoutGrid, FolderOpen, 
    Menu, X, Mail, Compass, TrendingUp, Ticket, LayoutDashboard, Shield,
    Calendar, Radio, FileText, Music, Settings, LogOut, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import AdminDashboardLink from './AdminDashboardLink';

const AdminCommunityHubLayout = ({ children, title, description, action, studioHeader, hideTabs = false, tabs: customTabs, accentColor = 'neon-green' }) => {
    const location = useLocation();
    const { user, maintenanceState, messages } = useStore();
    const cards = maintenanceState?.features || {};
    const unreadCount = messages?.filter(m => m.status === 'new').length || 0;
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const defaultTabs = [
        { name: 'GIGS', path: '/admin/volunteer-gigs', icon: Users, color: 'text-neon-green' },
        { name: 'GUESTLISTS', path: '/admin/guestlists', icon: ListChecks, color: 'text-neon-blue' },
        { name: 'FORMS', path: '/admin/forms', icon: ClipboardList, color: 'text-neon-pink' },
        { name: 'DOCUMENTS', path: '/admin/documents', icon: FolderOpen, color: 'text-neon-blue' },
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
                { name: "Contracts", path: "/admin/agreements", icon: ListChecks, color: "neon-purple", show: !cards.docs },
                { name: "Documents", path: "/admin/documents", icon: FolderOpen, color: "neon-blue", show: true }
            ]
        },
        {
            title: "Core Content Infrastructure",
            color: "text-neon-pink",
            visible: user?.role !== 'scanner' && user?.role !== 'gate_manager',
            links: [
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
                { name: "Giveaways", path: "/admin/giveaways", icon: Sparkles, color: "neon-purple", show: !cards.giveaways },
                { name: "Artistant", path: "/admin/artistant", icon: Music, color: "neon-blue", show: !cards.artists },
                { name: "Mailing", path: "/admin/mailing", icon: Mail, color: "neon-blue", show: !cards.mailing },
                { name: "Members", path: "/admin/manage-admins", icon: Shield, color: "neon-blue", show: user?.role !== 'editor' && user?.role !== 'content_admin' && user?.role !== 'blog_writer' && !cards.admins },
                { name: "Inbox", path: "/admin/messages", icon: Mail, color: "white", show: !cards.messages }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 md:pt-48 pb-32 relative overflow-x-clip selection:bg-neon-green selection:text-black">
            {/* Cinematic Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse delay-1000" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-neon-pink/5 rounded-full blur-[150px] animate-pulse delay-700" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            </div>

            <div className="relative z-10 max-w-[1700px] mx-auto px-4 md:px-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-6 md:gap-8">
                    <div className="space-y-4 md:space-y-8 w-full md:w-auto">
                        {studioHeader ? (
                            <div className="space-y-1 md:space-y-2">
                                <div className="flex items-center gap-2 md:gap-3">
                                    {studioHeader.logo ? (
                                        <img src={studioHeader.logo} alt="Logo" className="h-8 md:h-16 w-auto object-contain mb-2" />
                                    ) : (
                                        studioHeader.icon ? <studioHeader.icon size={12} className={cn(studioHeader.accentClass, "md:w-4 md:h-4")} /> : <Sparkles size={12} className={cn(studioHeader.accentClass, "md:w-4 md:h-4")} />
                                    )}
                                    {!studioHeader.logo && <span className={cn(studioHeader.accentClass, "text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em]")}>Operations Hub</span>}
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
                        
                        <AdminDashboardLink className="hidden md:inline-flex" />
                    </div>

                    {/* Navigation Tabs (Header - Desktop Only) */}
                    {!hideTabs && (
                        <div className="hidden md:flex w-full md:w-auto justify-start md:justify-end -mx-4 md:mx-0 px-4 md:px-0">
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
                                            <Icon size={14} className={cn(isActive ? "text-black" : tab.color || activeTextClass, "md:size-[16px]")} />
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

                {/* Content Container (Redesigned with Premium Glassmorphism) */}
                <div className="admin-hub-content-container bg-[#050505]/40 border border-white/5 rounded-[2.5rem] md:rounded-[3.5rem] p-4 sm:p-6 md:p-10 backdrop-blur-3xl min-h-[60vh] shadow-[0_30px_70px_rgba(0,0,0,0.8)] relative overflow-hidden">
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
                                <div className="shrink-0 w-full md:w-auto relative z-20">
                                    {action}
                                </div>
                            )}
                        </div>
                    )}
                    {children}
                </div>

                {/* Footer Return Link */}
                <div className="mt-12 flex justify-center md:justify-end pb-24 md:pb-0">
                    <Link 
                        to="/admin" 
                        className="group flex items-center gap-4 px-10 py-5 bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.05] rounded-[2rem] transition-all duration-500 shadow-xl"
                    >
                        <LayoutGrid size={16} className="text-neon-blue group-hover:rotate-90 transition-transform duration-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 group-hover:text-white transition-colors">RETURN TO DASHBOARD</span>
                    </Link>
                </div>
            </div>

            {/* Mobile Persistent Floating Control Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-[420px] h-16 bg-[#050505]/80 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-between p-2 shadow-2xl md:hidden">
                <Link
                    to="/admin"
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                    title="Central Command"
                >
                    <LayoutDashboard size={16} />
                </Link>
                
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex-1 mx-2 h-10 rounded-full bg-gradient-to-r from-neon-green/10 via-neon-blue/10 to-neon-pink/10 border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98]"
                >
                    <Compass size={14} className="text-neon-blue animate-pulse" />
                    <span>{title || "COMMAND MENU"}</span>
                    {isMenuOpen ? <X size={12} className="ml-1" /> : <Menu size={12} className="ml-1" />}
                </button>
                
                <Link
                    to="/admin/messages"
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white relative transition-all active:scale-90"
                    title="Inbox"
                >
                    <Mail size={16} />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-neon-pink border-2 border-black rounded-full animate-pulse shadow-[0_0_8px_rgba(255,79,139,0.8)]" />
                    )}
                </Link>
            </div>

            {/* Switcher Drawer Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        className="fixed inset-0 z-[90] bg-[#020202]/98 backdrop-blur-3xl overflow-y-auto px-6 pt-28 pb-32 md:hidden flex flex-col"
                    >
                        <div className="max-w-md mx-auto w-full space-y-8">
                            <div className="text-center">
                                <div className="inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 mb-4">
                                    <LayoutGrid className="text-neon-green w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black font-heading uppercase tracking-tighter italic text-white leading-none">COMMAND HUB INDEX</h2>
                                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500 mt-2">Central Mission Control Modules</p>
                            </div>

                            <div className="space-y-6">
                                {sections.map((section) => {
                                    if (!section.visible) return null;
                                    const visibleLinks = section.links.filter(l => l.show);
                                    if (visibleLinks.length === 0) return null;

                                    return (
                                        <div key={section.title} className="space-y-2">
                                            <h4 className={cn("text-[9px] font-black uppercase tracking-[0.3em] pl-3", section.color)}>
                                                {section.title}
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {visibleLinks.map((link) => {
                                                    const LinkIcon = link.icon;
                                                    const isActive = location.pathname === link.path;
                                                    return (
                                                        <Link
                                                            key={link.name}
                                                            to={link.path}
                                                            onClick={() => setIsMenuOpen(false)}
                                                            className={cn(
                                                                "flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 border",
                                                                isActive 
                                                                    ? "bg-white text-black font-black border-white"
                                                                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/5"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <LinkIcon size={16} className={isActive ? "text-black" : `text-${link.color}`} />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest">{link.name}</span>
                                                            </div>
                                                            <ChevronRight size={14} className="opacity-40" />
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
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminCommunityHubLayout;
