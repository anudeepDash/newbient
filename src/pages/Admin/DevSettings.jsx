import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Globe from 'lucide-react/dist/esm/icons/globe';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Terminal from 'lucide-react/dist/esm/icons/terminal';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Zap from 'lucide-react/dist/esm/icons/zap';
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Users from 'lucide-react/dist/esm/icons/users';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Image from 'lucide-react/dist/esm/icons/image';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Star from 'lucide-react/dist/esm/icons/star';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Save from 'lucide-react/dist/esm/icons/save';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Target from 'lucide-react/dist/esm/icons/target';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Power from 'lucide-react/dist/esm/icons/power';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';

const SystemControlCenter = () => {
    const { 
        user, maintenanceState = {}, toggleMaintenanceFeature, toggleGlobalMaintenance,
        siteDetails = {}, updateSiteDetails, siteSettings = {}, updateGeneralSettings, addToast
    } = useStore();
    
    const [formData, setFormData] = useState({ ...siteDetails });
    const [isConfigExpanded, setIsConfigExpanded] = useState(false);
    const [showKillConfirm, setShowKillConfirm] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    useEffect(() => {
        if (siteDetails && !isDirty && Object.keys(siteDetails).length > 0) setFormData({ ...siteDetails });
    }, [siteDetails, isDirty]);

    const isAdmin = user && ['developer', 'super_admin', 'founder'].includes(user.role);

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#020202] flex items-center justify-center text-gray-900 dark:text-white p-4">
                <Card className="max-w-md w-full p-8 border-red-500/30 bg-red-500/5 text-center shadow-2xl backdrop-blur-xl">
                    <Shield size={64} className="mx-auto mb-6 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" />
                    <h1 className="text-3xl font-black font-heading tracking-tighter uppercase italic mb-3">ACCESS DENIED</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed mb-8">
                        System handshake failed.<br/>Required clearance missing.
                    </p>
                    <Link to="/admin">
                        <Button variant="outline" className="w-full h-12 border-red-500/30 text-red-500 text-[10px] hover:bg-red-500 hover:text-white transition-all font-black tracking-widest uppercase rounded-xl">
                            RETURN TO DASHBOARD
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        try {
            await updateSiteDetails(formData);
            setIsDirty(false);
            addToast('System configuration synchronized.', 'success');
        } catch (error) {
            addToast('Synchronization failed.', 'error');
        }
    };

    const categories = useMemo(() => [
        {
            title: "Public Interfaces",
            subtitle: "User-facing Pages",
            icon: Globe,
            key: "pages",
            items: [
                { label: "Home", id: "home", icon: LayoutGrid },
                { label: "Concerts", id: "concerts", icon: Mic2 },
                { label: "Artist Ant", id: "artistant_public", icon: Star },
                { label: "Community", id: "community", icon: Users },
                { label: "Creators", id: "influencer_public", icon: Zap },
                { label: "Giveaways", id: "giveaways_public", icon: Gift },
                { label: "Contact", id: "contact", icon: MessageSquare },
                { label: "Forms", id: "forms_public", icon: FileText },
                { label: "Tickets", id: "ticketing", icon: ScanLine },
            ]
        },
        {
            title: "System Engines",
            subtitle: "Admin Modules",
            icon: Briefcase,
            key: "features",
            items: [
                { label: "Invoices", id: "invoices", icon: HardDrive },
                { label: "Documents", id: "docs", icon: FileText },
                { label: "Portfolio", id: "concerts", icon: Image },
                { label: "Artists", id: "artists", icon: Users },
                { label: "Requests", id: "client_requests", icon: Activity },
                { label: "Guestlists", id: "guestlists", icon: Ticket },
                { label: "Events", id: "upcoming_events", icon: Calendar },
                { label: "Influencer", id: "influencer", icon: Zap },
                { label: "Giveaways", id: "giveaways", icon: Gift },
                { label: "Newsletter", id: "blog_announcements", icon: BookOpen },
                { label: "Ticketing", id: "ticketing", icon: ScanLine },
                { label: "Mailing", id: "mailing", icon: Mail },
                { label: "Messages", id: "messages", icon: MessageSquare },
                { label: "Members", id: "admins", icon: Shield },
                { label: "Community", id: "community", icon: Users },
            ]
        },
        {
            title: "UI Modules",
            subtitle: "Sections",
            icon: LayoutGrid,
            key: "sections",
            items: [
                { label: "Home Events", id: "home_upcoming", icon: Calendar },
                { label: "Home Portfolio", id: "home_portfolio", icon: Image },
                { label: "Blog Featured", id: "blog_featured", icon: Star },
            ]
        }
    ], []);

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'System',
                subtitle: 'Command',
                icon: Terminal,
                accentClass: 'text-neon-blue'
            }}
            accentColor="neon-blue"
            hideTabs={true}
            action={
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <div className="flex items-center gap-2 bg-white dark:bg-black/40 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 shadow-sm">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isLocal ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.5)]'}`} />
                        {isLocal ? 'Development Env' : 'Production Env'}
                    </div>
                </div>
            }
        >
            <div className="space-y-8 md:space-y-12">
                {/* Global Kill Switch */}
                <Card className={`relative overflow-hidden border-2 transition-all duration-500 ${maintenanceState.global ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-black/5 dark:border-white/5 bg-white dark:bg-[#080808]'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-10 gap-8">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className={`shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl shadow-inner ${maintenanceState.global ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-gray-500'}`}>
                                <Power size={32} className={maintenanceState.global ? 'animate-pulse' : ''} />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none mb-2 text-gray-900 dark:text-white">Global Lockdown</h2>
                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Instantly pause all public traffic</p>
                            </div>
                        </div>
                        
                        <Button
                            onClick={() => setShowKillConfirm(true)}
                            className={cn(
                                "h-14 px-8 w-full md:w-auto text-xs font-black italic tracking-widest rounded-2xl transition-all duration-300 shadow-xl",
                                maintenanceState.global 
                                    ? "bg-red-500 text-white hover:bg-red-600 hover:scale-105" 
                                    : "bg-gray-900 dark:bg-white text-white dark:text-black hover:scale-105"
                            )}
                        >
                            {maintenanceState.global ? 'TERMINATE LOCKDOWN' : 'ACTIVATE LOCKDOWN'}
                        </Button>
                    </div>
                </Card>

                {/* Main Control Deck */}
                <div className="space-y-12">
                    <div className="mb-8">
                        <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">Page-Wise Maintenance.</h2>
                        <p className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Toggle individual modules on or off instantly</p>
                    </div>

                    {categories.map((cat, idx) => (
                        <div key={cat.key} className="bg-white dark:bg-[#080808] border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-neon-blue/10 text-neon-blue rounded-xl">
                                    <cat.icon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white uppercase tracking-widest leading-none mb-1">{cat.title}</h3>
                                    <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">{cat.subtitle}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cat.items.map((item, itemIdx) => {
                                    const isOffline = maintenanceState[cat.key]?.[item.id];
                                    const isOnline = !isOffline;
                                    
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: (idx * 0.05) + (itemIdx * 0.02) }}
                                        >
                                            <div 
                                                onClick={() => toggleMaintenanceFeature(cat.key, item.id)}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 border shadow-sm hover:shadow-md",
                                                    isOnline 
                                                        ? "bg-gray-50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 hover:border-neon-green/30" 
                                                        : "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "p-2.5 rounded-xl transition-colors",
                                                        isOnline ? "bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400" : "bg-red-500/20 text-red-500"
                                                    )}>
                                                        <item.icon size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className={cn(
                                                            "text-[11px] font-black uppercase tracking-widest mb-0.5 transition-colors",
                                                            isOnline ? "text-gray-900 dark:text-white" : "text-gray-500"
                                                        )}>
                                                            {item.label}
                                                        </h4>
                                                        <p className="text-[8px] font-mono text-gray-500 uppercase">{item.id}</p>
                                                    </div>
                                                </div>

                                                {/* iOS Style Toggle Switch */}
                                                <div className={cn(
                                                    "w-11 h-6 rounded-full p-1 flex items-center transition-colors duration-300",
                                                    isOnline ? "bg-neon-green justify-end" : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                                                )}>
                                                    <motion.div 
                                                        layout
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                        className="w-4 h-4 bg-white rounded-full shadow-md"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* System Configuration Section */}
                    <div className="bg-white dark:bg-[#080808] border border-black/5 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
                        <div 
                            className="flex items-center justify-between p-6 md:p-8 cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.02] transition-colors"
                            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isConfigExpanded}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsConfigExpanded(!isConfigExpanded); } }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-neon-blue/10 text-neon-blue rounded-xl">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white uppercase tracking-widest leading-none mb-1">Global Configuration</h3>
                                    <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">Metadata, Contacts & Feature Flags</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-500">
                                {isConfigExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        <AnimatePresence>
                            {isConfigExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-t border-black/5 dark:border-white/5"
                                >
                                    <form onSubmit={handleSaveConfig} className="p-6 md:p-8">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                            {/* Brand Identity */}
                                            <div className="space-y-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-blue flex items-center gap-2">
                                                    <Sparkles size={14} /> Identity & SEO
                                                </h4>
                                                <div className="space-y-5">
                                                    <ConfigInput label="System Title" name="title" icon={Settings} value={formData.title} onChange={handleChange} />
                                                    <ConfigInput label="Strategic Tagline" name="tagline" icon={Zap} value={formData.tagline} onChange={handleChange} />
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Global Meta Description</label>
                                                        <textarea
                                                            name="description"
                                                            value={formData.description || ''}
                                                            onChange={handleChange}
                                                            className="w-full bg-gray-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl p-4 text-[11px] font-medium h-28 focus:border-neon-blue/50 outline-none transition-all text-gray-900 dark:text-white resize-none"
                                                            placeholder="SEO Meta data..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Channels & Outreach */}
                                            <div className="space-y-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-pink flex items-center gap-2">
                                                    <Mail size={14} /> Communications
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                    <ConfigInput label="Official Email" name="email" icon={Mail} value={formData.email} onChange={handleChange} />
                                                    <ConfigInput label="Hotline / Contact" name="phone" icon={Phone} value={formData.phone} onChange={handleChange} />
                                                    <ConfigInput label="WhatsApp Group" name="whatsappCommunity" icon={Globe} value={formData.whatsappCommunity} onChange={handleChange} />
                                                    <ConfigInput label="Instagram Handle" name="instagram" icon={Instagram} value={formData.instagram} onChange={handleChange} />
                                                </div>

                                                <div className="pt-6">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-green mb-4 flex items-center gap-2">
                                                        <Target size={14} /> Feature Flags
                                                    </h4>
                                                    <div className="flex flex-col gap-3">
                                                        <FeaturePill 
                                                            label="Tribe Onboarding Form" 
                                                            active={siteSettings.enableTribeForm !== false} 
                                                            onClick={() => updateGeneralSettings({ enableTribeForm: !siteSettings.enableTribeForm })}
                                                        />
                                                        <FeaturePill 
                                                            label="Volunteer Gigs Board" 
                                                            active={siteSettings.showVolunteerGigs !== false} 
                                                            onClick={() => updateGeneralSettings({ showVolunteerGigs: !siteSettings.showVolunteerGigs })}
                                                        />
                                                        <FeaturePill 
                                                            label="Client Marquee Display" 
                                                            active={siteSettings.showPastClients !== false} 
                                                            onClick={() => updateGeneralSettings({ showPastClients: !siteSettings.showPastClients })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-10 pt-8 border-t border-black/5 dark:border-white/5 flex justify-end">
                                            <Button type="submit" disabled={!isDirty} className="h-12 md:h-14 px-8 md:px-12 bg-neon-blue text-black font-black uppercase tracking-widest text-[10px] md:text-xs italic rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100">
                                                <Save size={16} className="mr-3" /> Push System Update
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Diagnostics */}
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    <div className="lg:col-span-2 p-6 md:p-8 bg-white dark:bg-[#080808] border border-black/5 dark:border-white/5 rounded-3xl shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield size={18} className="text-neon-blue" />
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white">Error Code Registry</h4>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[10px] font-mono whitespace-nowrap md:whitespace-normal">
                                <thead className="text-gray-500 border-b border-black/5 dark:border-white/5">
                                    <tr>
                                        <th className="pb-4 pr-6 font-black uppercase tracking-widest">Code</th>
                                        <th className="pb-4 pr-6 font-black uppercase tracking-widest">Module</th>
                                        <th className="pb-4 font-black uppercase tracking-widest">Scenario</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 dark:text-gray-400">
                                    <ErrorRow code="TKT-VAL-*" module="Ticketing" scenario="User input validation (Phone, Name, Selection)" />
                                    <ErrorRow code="TKT-OTP-01" module="Ticketing" scenario="FCM/Auth Handshake - Code Send failure" />
                                    <ErrorRow code="TKT-OTP-02" module="Ticketing" scenario="Incorrect OTP verification attempt" />
                                    <ErrorRow code="TKT-PAY-01" module="Ticketing" scenario="Critical: Order commit failure after payment attempt" />
                                    <ErrorRow code="TKT-CPN-01" module="Ticketing" scenario="Coupon validation/lookup error" />
                                    <ErrorRow code="TKT-GST-01" module="Ticketing" scenario="Guestlist entry commit failure" />
                                    <ErrorRow code="ANN-01" module="Announcements" scenario="Database write failure for new announcement" />
                                    <ErrorRow code="EVT-01" module="Events" scenario="Event creation/update synchronization error" />
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 bg-white dark:bg-[#080808] border border-black/5 dark:border-white/5 rounded-3xl shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <Cpu size={18} className="text-neon-purple" />
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Core Diagnostics</h4>
                            </div>

                            <div className="space-y-6 font-mono text-[10px]">
                                <div>
                                    <p className="text-gray-500 uppercase tracking-widest mb-1.5">Host Identity</p>
                                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl border border-black/5 dark:border-white/5 truncate">{window.location.hostname}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 uppercase tracking-widest mb-1.5">Registry Vector</p>
                                    <p className="text-neon-blue bg-neon-blue/10 p-3 rounded-xl truncate font-black">Local_Storage_Sync</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 uppercase tracking-widest mb-1.5">State Flux</p>
                                    <div className="h-2 bg-gray-100 dark:bg-zinc-900 rounded-full overflow-hidden mt-2">
                                        <motion.div 
                                            animate={{ width: ['20%', '80%', '20%'] }}
                                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                                            className="h-full bg-neon-purple"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-600 text-right mt-8">NB_SYS_772_NODE</span>
                    </div>
                </div>

                {/* Kill Switch Modal */}
                {showKillConfirm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 max-w-md w-full border border-red-500/30 shadow-2xl"
                        >
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle size={40} className="text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                                    {maintenanceState.global ? 'Deactivate Lockdown?' : 'Activate Lockdown?'}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {maintenanceState.global 
                                        ? 'This will immediately bring the site back online and allow public traffic.'
                                        : 'This will immediately lock down the entire site. All non-developer users will see the maintenance page.'}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                                    <button 
                                        onClick={() => setShowKillConfirm(false)}
                                        className="flex-1 px-6 py-4 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => { toggleGlobalMaintenance(); setShowKillConfirm(false); }}
                                        className={`flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white transition-all shadow-lg ${
                                            maintenanceState.global ? 'bg-neon-green text-black hover:scale-105' : 'bg-red-600 hover:bg-red-500 hover:scale-105'
                                        }`}
                                    >
                                        {maintenanceState.global ? 'Bring Online' : 'Activate Lockdown'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </AdminCommunityHubLayout>
    );
};

const ConfigInput = ({ label, name, icon: Icon, value, onChange }) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">{label}</label>
        <div className="relative">
            <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
                name={name}
                value={value || ''}
                onChange={onChange}
                className="h-14 pl-12 bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-xl text-xs font-bold focus:border-neon-blue/50 transition-all text-gray-900 dark:text-white w-full"
                placeholder="..."
            />
        </div>
    </div>
);

const FeaturePill = ({ label, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
            active 
                ? "bg-neon-green/10 border-neon-green/30 text-neon-green hover:bg-neon-green/20" 
                : "bg-gray-50 dark:bg-zinc-900 border-black/5 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white"
        )}
    >
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        <div className={cn("w-8 h-4 rounded-full flex items-center p-0.5 transition-colors", active ? "bg-neon-green justify-end" : "bg-gray-300 dark:bg-zinc-700 justify-start")}>
            <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
        </div>
    </button>
);

const ErrorRow = ({ code, module, scenario }) => (
    <tr className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
        <td className="py-4 pr-6 text-neon-blue font-black tracking-tighter">{code}</td>
        <td className="py-4 pr-6 text-gray-900 dark:text-gray-300 uppercase italic font-bold">{module}</td>
        <td className="py-4 text-gray-500 italic whitespace-normal">{scenario}</td>
    </tr>
);

export default SystemControlCenter;
