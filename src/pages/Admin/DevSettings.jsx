import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Power from 'lucide-react/dist/esm/icons/power';
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
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Save from 'lucide-react/dist/esm/icons/save';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import Phone from 'lucide-react/dist/esm/icons/phone';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Target from 'lucide-react/dist/esm/icons/target';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const SystemControlCenter = () => {
    const { 
        user, maintenanceState, toggleMaintenanceFeature, toggleGlobalMaintenance,
        siteDetails, updateSiteDetails, siteSettings, updateGeneralSettings, addToast
    } = useStore();
    
    const [formData, setFormData] = useState({ ...siteDetails });
    const [isConfigExpanded, setIsConfigExpanded] = useState(false);
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    useEffect(() => {
        if (siteDetails) setFormData({ ...siteDetails });
    }, [siteDetails]);

    const isAdmin = user?.role === 'developer';

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center text-white p-4">
                <Card className="max-w-md w-full p-8 border-red-500/30 bg-red-500/5 text-center">
                    <Shield size={48} className="mx-auto mb-4 text-red-500" />
                    <h1 className="text-2xl font-black font-heading tracking-tighter uppercase italic mb-2">ACCESS DENIED</h1>
                    <p className="text-gray-400 text-xs uppercase tracking-widest leading-relaxed">
                        System handshake failed. Required clearance missing.
                    </p>
                    <Link to="/admin">
                        <Button variant="outline" className="mt-6 w-full border-red-500/30 text-red-500 text-xs font-black tracking-widest uppercase">
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
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        try {
            await updateSiteDetails(formData);
            addToast('System configuration synchronized.', 'success');
        } catch (error) {
            addToast('Synchronization failed.', 'error');
        }
    };

    const categories = [
        {
            title: "Pages",
            subtitle: "Public Interfaces",
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
            title: "Admin",
            subtitle: "System Engines",
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
            title: "Sections",
            subtitle: "UI Modules",
            icon: Settings,
            key: "sections",
            items: [
                { label: "Home Events", id: "home_upcoming", icon: Calendar },
                { label: "Home Portfolio", id: "home_portfolio", icon: Image },
                { label: "Blog Featured", id: "blog_featured", icon: Star },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-32">
            {/* Minimal Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-neon-pink/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-48">
                {/* Slim Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div className="space-y-6">
                        <div className="flex flex-col">
                             <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tighter uppercase italic leading-none">
                                SYSTEM <span className="text-neon-blue">COMMAND.</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Terminal size={12} className="text-neon-blue" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">v2.5.0_Root</span>
                            </div>
                        </div>
                        <AdminDashboardLink />
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <div className={`w-1.5 h-1.5 rounded-full ${isLocal ? 'bg-yellow-500' : 'bg-neon-green'}`} />
                            {isLocal ? 'Development' : 'Production'}
                        </div>
                    </div>
                </div>

                {/* Compact Kill Switch */}
                <Card className={`mb-12 overflow-hidden border-2 transition-all duration-500 ${maintenanceState.global ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${maintenanceState.global ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                                <Globe size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase italic tracking-tighter leading-none mb-1">Global Maintenance</h2>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Sitewide traffic redirection</p>
                            </div>
                        </div>
                        
                        <Button
                            onClick={toggleGlobalMaintenance}
                            className={`h-12 px-8 text-xs font-black italic tracking-widest rounded-xl transition-all duration-300 ${maintenanceState.global ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            {maintenanceState.global ? 'TERMINATE MAINTENANCE' : 'ACTIVATE LOCKDOWN'}
                        </Button>
                    </div>
                </Card>

                {/* Main Control Deck */}
                <div className="space-y-16">
                    {/* Architecture Grid */}
                    {categories.map((cat, idx) => (
                        <div key={cat.key}>
                            <div className="flex items-center gap-3 mb-6">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">{cat.title}</h3>
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="text-[10px] font-mono text-gray-700 uppercase italic">{cat.subtitle}</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {cat.items.map((item, itemIdx) => {
                                    const isOffline = maintenanceState[cat.key]?.[item.id];
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: (idx * 0.05) + (itemIdx * 0.02) }}
                                        >
                                            <Card
                                                onClick={() => toggleMaintenanceFeature(cat.key, item.id)}
                                                className={`group relative cursor-pointer transition-all duration-300 overflow-hidden border-white/5 hover:border-white/10 ${isOffline ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 hover:bg-white/[0.08]'}`}
                                            >
                                                <div className="p-4 flex flex-col gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className={`p-2 rounded-lg transition-all duration-300 ${isOffline ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400 group-hover:text-neon-blue group-hover:bg-neon-blue/10'}`}>
                                                            <item.icon size={16} />
                                                        </div>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-red-500' : 'bg-neon-green/30 group-hover:bg-neon-green shadow-none group-hover:shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all'}`} />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <h4 className={`text-[10px] font-black uppercase italic tracking-widest truncate transition-colors ${isOffline ? 'text-red-400' : 'text-gray-300 group-hover:text-white'}`}>
                                                            {item.label}
                                                        </h4>
                                                        <p className="text-[8px] font-mono text-gray-700 uppercase leading-none">{item.id}</p>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* System Configuration Section */}
                    <div>
                        <div 
                            className="flex items-center gap-3 mb-6 cursor-pointer group"
                            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                        >
                            <h3 className="text-sm font-black text-neon-blue uppercase tracking-[0.3em]">System Configuration</h3>
                            <div className="flex-1 h-px bg-neon-blue/10 group-hover:bg-neon-blue/30 transition-colors" />
                            {isConfigExpanded ? <ChevronUp size={16} className="text-neon-blue" /> : <ChevronDown size={16} className="text-neon-blue" />}
                        </div>

                        <AnimatePresence>
                            {isConfigExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <form onSubmit={handleSaveConfig} className="space-y-8 pb-12">
                                        <Card className="p-8 bg-white/[0.02] border-white/5 rounded-3xl">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                {/* Brand Identity */}
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                                                        <Sparkles size={12} className="text-neon-blue" /> Identity & SEO
                                                    </h4>
                                                    <div className="space-y-4">
                                                        <ConfigInput label="System Title" name="title" icon={Settings} value={formData.title} onChange={handleChange} />
                                                        <ConfigInput label="Strategic Tagline" name="tagline" icon={Zap} value={formData.tagline} onChange={handleChange} />
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-1">Global Meta Description</label>
                                                            <textarea
                                                                name="description"
                                                                value={formData.description || ''}
                                                                onChange={handleChange}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-[11px] font-medium h-24 focus:border-neon-blue/30 outline-none transition-all text-gray-300"
                                                                placeholder="SEO Meta data..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Channels & Outreach */}
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                                                        <Mail size={12} className="text-neon-pink" /> Communications
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <ConfigInput label="Official Email" name="email" icon={Mail} value={formData.email} onChange={handleChange} />
                                                        <ConfigInput label="Hotline / Contact" name="phone" icon={Phone} value={formData.phone} onChange={handleChange} />
                                                        <ConfigInput label="WhatsApp Group" name="whatsappCommunity" icon={Globe} value={formData.whatsappCommunity} onChange={handleChange} />
                                                        <ConfigInput label="Instagram Handle" name="instagram" icon={Instagram} value={formData.instagram} onChange={handleChange} />
                                                    </div>

                                                    <div className="pt-6">
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4 flex items-center gap-2">
                                                            <Target size={12} className="text-neon-green" /> Feature Orchestration
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            <FeaturePill 
                                                                label="Tribe Onboarding" 
                                                                active={siteSettings.enableTribeForm !== false} 
                                                                onClick={() => updateGeneralSettings({ enableTribeForm: !siteSettings.enableTribeForm })}
                                                            />
                                                            <FeaturePill 
                                                                label="Volunteer Gigs" 
                                                                active={siteSettings.showVolunteerGigs !== false} 
                                                                onClick={() => updateGeneralSettings({ showVolunteerGigs: !siteSettings.showVolunteerGigs })}
                                                            />
                                                            <FeaturePill 
                                                                label="Client Marquee" 
                                                                active={siteSettings.showPastClients !== false} 
                                                                onClick={() => updateGeneralSettings({ showPastClients: !siteSettings.showPastClients })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-12 pt-8 border-t border-white/5 flex justify-end">
                                                <Button type="submit" className="h-12 px-10 bg-neon-blue text-black font-black uppercase tracking-widest text-[10px] italic rounded-xl hover:scale-105 transition-all">
                                                    <Save size={14} className="mr-2" /> Push System Update
                                                </Button>
                                            </div>
                                        </Card>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Compact Diagnostics & Error Codes */}
                <div className="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield size={16} className="text-neon-blue" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Error Code Registry</h4>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[10px] font-mono">
                                <thead className="text-gray-600 border-b border-white/5">
                                    <tr>
                                        <th className="pb-3 pr-4 font-black uppercase italic">Code</th>
                                        <th className="pb-3 pr-4 font-black uppercase italic">Module</th>
                                        <th className="pb-3 font-black uppercase italic">Scenario</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-400">
                                    <ErrorRow code="TKT-VAL-*" module="Ticketing" scenario="User input validation (Phone, Name, Selection)" />
                                    <ErrorRow code="TKT-OTP-01" module="Ticketing" scenario="FCM/Auth Handshake - Code Send failure" />
                                    <ErrorRow code="TKT-OTP-02" module="Ticketing" scenario="Incorrect OTP verification attempt" />
                                    <ErrorRow code="TKT-PAY-01" module="Ticketing" scenario="Critical: Order commit failure after payment attempt" />
                                    <ErrorRow code="TKT-CPN-01" module="Ticketing" scenario="Coupon validation/lookup error" />
                                    <ErrorRow code="TKT-GST-01" module="Ticketing" scenario="Guestlist entry commit failure" />
                                    <ErrorRow code="ANN-01" module="Announcements" scenario="Database write failure for new announcement" />
                                    <ErrorRow code="EVT-01" module="Events" scenario="Event creation/update synchronization error" />
                                    <ErrorRow code="GUEST-01" module="Guestlist" scenario="General guestlist management error" />
                                    <ErrorRow code="FORM-01" module="Forms" scenario="Dynamic form submission or config error" />
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-6 text-[8px] text-gray-700 italic">Note: Error codes starting with TKT/PAY/EVT automatically trigger support contact info in UI toasts.</p>
                    </div>

                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <Cpu size={14} className="text-gray-600" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-600">Core Diagnostics</h4>
                            </div>

                            <div className="space-y-6 font-mono text-[10px]">
                                <div>
                                    <p className="text-gray-700 uppercase mb-1">Host Identity</p>
                                    <p className="text-gray-400 truncate">{window.location.hostname}</p>
                                </div>
                                <div>
                                    <p className="text-gray-700 uppercase mb-1">Registry Vector</p>
                                    <p className="text-neon-blue truncate">Local_Storage_Sync</p>
                                </div>
                                <div>
                                    <p className="text-gray-700 uppercase mb-1">State Flux</p>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                                        <motion.div 
                                            animate={{ width: ['20%', '80%', '20%'] }}
                                            transition={{ duration: 10, repeat: Infinity }}
                                            className="h-full bg-neon-blue/20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono text-gray-800 text-right mt-8">NB_SYS_772_NODE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConfigInput = ({ label, name, icon: Icon, value, onChange }) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-1">{label}</label>
        <div className="relative">
            <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
                name={name}
                value={value || ''}
                onChange={onChange}
                className="h-11 pl-11 bg-black/40 border-white/5 rounded-xl text-[11px] font-medium focus:border-neon-blue/30 transition-all text-gray-200"
                placeholder="..."
            />
        </div>
    </div>
);

const FeaturePill = ({ label, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${active ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
    >
        {label}: {active ? 'ACTIVE' : 'DISABLED'}
    </button>
);

const ErrorRow = ({ code, module, scenario }) => (
    <tr className="border-b border-white/5 last:border-0">
        <td className="py-3 pr-4 text-neon-blue font-black tracking-tighter">{code}</td>
        <td className="py-3 pr-4 text-gray-300 uppercase italic">{module}</td>
        <td className="py-3 text-gray-500 italic">{scenario}</td>
    </tr>
);

export default SystemControlCenter;
