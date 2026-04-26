import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Save, Users, Globe, Settings, Bell, Shield, Sparkles, Zap, Heart, Instagram, Linkedin, Mail, Phone, MapPin, FileText, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';

const SiteSettings = () => {
    const { siteDetails, updateSiteDetails, siteSettings, updateGeneralSettings, maintenanceState, toggleMaintenanceFeature, toggleGlobalMaintenance } = useStore();
    const navigate = useNavigate();
    const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);

    const [formData, setFormData] = useState({ ...siteDetails });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateSiteDetails(formData);
            alert('Settings updated successfully.');
            navigate('/admin');
        } catch (error) {
            alert('Failed to update settings.');
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden pb-20">
            {/* Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                {/* Modern Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-16 gap-8">
                    <div className="space-y-4 max-w-full">
                        <AdminDashboardLink className="mb-4" />
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[0.9] pb-4 pr-12 pl-1 overflow-visible">
                            SYSTEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">COMMAND.</span>
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                    {/* System Critical Section */}
                    <section className="space-y-6">
                        <div 
                            className="flex items-center gap-4 cursor-pointer group"
                            onClick={() => setIsMaintenanceOpen(!isMaintenanceOpen)}
                        >
                            <h2 className="text-sm font-black font-heading tracking-widest uppercase text-red-500">Critical Controls</h2>
                            <div className="flex-1 h-px bg-white/5 group-hover:bg-red-500/20 transition-colors" />
                            {isMaintenanceOpen ? <ChevronUp className="text-red-500" size={16} /> : <ChevronDown className="text-red-500" size={16} />}
                        </div>
                        
                        {isMaintenanceOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ToggleCard 
                                        title="Global Maintenance" 
                                        desc="RESTRICT GLOBAL PUBLIC ACCESS." 
                                        icon={Shield}
                                        checked={maintenanceState.global === true}
                                        onChange={() => toggleGlobalMaintenance()}
                                        variant="danger"
                                    />
                                    <ToggleCard 
                                        title="Adaptive Menu" 
                                        desc="HIDE INACTIVE PAGES AUTOMATICALLY." 
                                        icon={Globe}
                                        checked={siteSettings.hideMaintenancePages === true}
                                        onChange={(val) => updateGeneralSettings({ hideMaintenancePages: val })}
                                    />
                                </div>

                                {/* Detailed Page Toggles */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Page Specific Maintenance</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <MiniToggle 
                                            label="Events Page" 
                                            checked={maintenanceState.pages?.upcoming_events === true}
                                            onChange={() => toggleMaintenanceFeature('pages', 'upcoming_events')}
                                        />
                                        <MiniToggle 
                                            label="Creator Hub" 
                                            checked={maintenanceState.pages?.influencer === true}
                                            onChange={() => toggleMaintenanceFeature('pages', 'influencer')}
                                        />
                                        <MiniToggle 
                                            label="Concert Zone" 
                                            checked={maintenanceState.pages?.concerts === true}
                                            onChange={() => toggleMaintenanceFeature('pages', 'concerts')}
                                        />

                                        <MiniToggle 
                                            label="Community" 
                                            checked={maintenanceState.pages?.community === true}
                                            onChange={() => toggleMaintenanceFeature('pages', 'community')}
                                        />
                                        <MiniToggle 
                                            label="Contact Page" 
                                            checked={maintenanceState.pages?.contact === true}
                                            onChange={() => toggleMaintenanceFeature('pages', 'contact')}
                                        />
                                    </div>
                                </div>

                                {/* Dashboard Card Visibility */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Dashboard Card Visibility</h3>
                                    <p className="text-[10px] text-gray-600 pl-1">Hidden cards appear dimmed to admins and are inaccessible to others.</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <MiniToggle label="Invoices" checked={maintenanceState.cards?.invoices === true} onChange={() => toggleMaintenanceFeature('cards', 'invoices')} />
                                        <MiniToggle label="Proposals" checked={maintenanceState.cards?.proposals === true} onChange={() => toggleMaintenanceFeature('cards', 'proposals')} />
                                        <MiniToggle label="Ticketing" checked={maintenanceState.cards?.tickets === true} onChange={() => toggleMaintenanceFeature('cards', 'tickets')} />
                                        <MiniToggle label="Upcoming Events" checked={maintenanceState.cards?.upcoming === true} onChange={() => toggleMaintenanceFeature('cards', 'upcoming')} />
                                        <MiniToggle label="Portfolio" checked={maintenanceState.cards?.portfolio === true} onChange={() => toggleMaintenanceFeature('cards', 'portfolio')} />

                                        <MiniToggle label="Broadcast" checked={maintenanceState.cards?.announcements === true} onChange={() => toggleMaintenanceFeature('cards', 'announcements')} />
                                        <MiniToggle label="Creators" checked={maintenanceState.cards?.creators === true} onChange={() => toggleMaintenanceFeature('cards', 'creators')} />
                                        <MiniToggle label="Campaigns" checked={maintenanceState.cards?.campaigns === true} onChange={() => toggleMaintenanceFeature('cards', 'campaigns')} />
                                        <MiniToggle label="Giveaways" checked={maintenanceState.cards?.giveaways === true} onChange={() => toggleMaintenanceFeature('cards', 'giveaways')} />
                                        <MiniToggle label="Members" checked={maintenanceState.cards?.members === true} onChange={() => toggleMaintenanceFeature('cards', 'members')} />
                                        <MiniToggle label="Inbox" checked={maintenanceState.cards?.inbox === true} onChange={() => toggleMaintenanceFeature('cards', 'inbox')} />
                                    </div>
                                </div>

                                {/* Admin Page Sections */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Home Page Sections</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <MiniToggle label="Upcoming Events" checked={maintenanceState.sections?.home_upcoming === true} onChange={() => toggleMaintenanceFeature('sections', 'home_upcoming')} />
                                        <MiniToggle label="Portfolio Grid" checked={maintenanceState.sections?.home_portfolio === true} onChange={() => toggleMaintenanceFeature('sections', 'home_portfolio')} />
                                        <MiniToggle label="Why Choose Us" checked={maintenanceState.sections?.home_why === true} onChange={() => toggleMaintenanceFeature('sections', 'home_why')} />
                                        <MiniToggle label="About Section" checked={maintenanceState.sections?.home_about === true} onChange={() => toggleMaintenanceFeature('sections', 'home_about')} />
                                        <MiniToggle label="Past Clients" checked={maintenanceState.sections?.home_clients === true} onChange={() => toggleMaintenanceFeature('sections', 'home_clients')} />
                                    </div>
                                </div>

                                {/* Detailed Feature Toggles */}
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Deep Feature Controls</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <MiniToggle 
                                            label="Ticket Booking" 
                                            checked={maintenanceState.features?.tickets === true}
                                            onChange={() => toggleMaintenanceFeature('features', 'tickets')}
                                        />
                                        <MiniToggle 
                                            label="Invoicing" 
                                            checked={maintenanceState.features?.invoices === true}
                                            onChange={() => toggleMaintenanceFeature('features', 'invoices')}
                                        />
                                        <MiniToggle 
                                            label="Form Submission" 
                                            checked={maintenanceState.features?.forms === true}
                                            onChange={() => toggleMaintenanceFeature('features', 'forms')}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </section>

                    {/* Site Configuration Card */}
                    <Card className="p-8 md:p-12 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem]">
                        <div className="space-y-12">
                            {/* Section: Identity */}
                            <div className="space-y-8">
                                <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Sparkles size={14} /> Brand Identity & Core SEO
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputGroup label="System Title" name="title" icon={Settings} value={formData.title} onChange={handleChange} placeholder="e.g. Newbi Management" />
                                    <InputGroup label="Strategic Tagline" name="tagline" icon={Zap} value={formData.tagline} onChange={handleChange} placeholder="e.g. Scaling Impact" />
                                    
                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Global Meta Description (SEO)</label>
                                        <div className="relative group">
                                            <FileText className="absolute left-4 top-4 text-gray-500 group-hover:text-neon-blue transition-colors" size={16} />
                                            <textarea
                                                name="description"
                                                value={formData.description || ''}
                                                onChange={handleChange}
                                                className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 pl-12 text-sm font-medium h-32 focus:border-neon-blue/50 outline-none transition-all placeholder:text-gray-700"
                                                placeholder="Enter high-impact description for search engines..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-white/5" />

                            {/* Section: Feature Toggles */}
                            <div className="space-y-8">
                                <h3 className="text-[10px] font-black text-neon-green uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Target size={14} /> Feature Orchestration
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <FeatureToggle 
                                        label="Onboarding Flow"
                                        checked={siteSettings.enableTribeForm !== false}
                                        onChange={(val) => updateGeneralSettings({ enableTribeForm: val })}
                                    />
                                    <FeatureToggle 
                                        label="Volunteer Gigs"
                                        checked={siteSettings.showVolunteerGigs !== false}
                                        onChange={(val) => updateGeneralSettings({ showVolunteerGigs: val })}
                                    />
                                    <FeatureToggle 
                                        label="Client Marquee"
                                        checked={siteSettings.showPastClients !== false}
                                        onChange={(val) => updateGeneralSettings({ showPastClients: val })}
                                    />
                                    <FeatureToggle 
                                        label="Analytics Engine"
                                        checked={siteSettings.showCreatorStats !== false}
                                        onChange={(val) => updateGeneralSettings({ showCreatorStats: val })}
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-white/5" />

                            {/* Section: Outreach */}
                            <div className="space-y-8">
                                <h3 className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Mail size={14} /> Communication Channels
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputGroup label="WhatsApp Community" name="whatsappCommunity" icon={Globe} value={formData.whatsappCommunity} onChange={handleChange} placeholder="Community Link" />
                                    <InputGroup label="Hotline / Contact" name="phone" icon={Phone} value={formData.phone} onChange={handleChange} placeholder="+91..." />
                                    <InputGroup label="Official Support Email" name="email" icon={Mail} value={formData.email} onChange={handleChange} placeholder="hello@newbi.live" />
                                    <InputGroup label="Social Authority (IG)" name="instagram" icon={Instagram} value={formData.instagram} onChange={handleChange} placeholder="IG Handle" />
                                    
                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Corporate HQ Address</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-4 text-gray-500 group-hover:text-neon-pink transition-colors" size={16} />
                                            <textarea
                                                name="address"
                                                value={formData.address || ''}
                                                onChange={handleChange}
                                                className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 pl-12 text-sm font-medium h-24 focus:border-neon-pink/50 outline-none transition-all placeholder:text-gray-700"
                                                placeholder="Primary business location..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Final Action */}
                    <div className="flex justify-center md:justify-end pt-8">
                        <Button type="submit" className="bg-white text-black font-black font-heading uppercase tracking-[0.2em] text-xs h-20 px-16 rounded-[2rem] hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                            <Save className="mr-3 h-5 w-5" /> Push Updates to Live System
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ToggleCard = ({ title, desc, icon: Icon, checked, onChange, variant = 'primary' }) => (
    <div className={cn(
        "p-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all",
        variant === 'danger' && "hover:border-red-500/30 font-bold"
    )}>
        <div className="flex items-center gap-5">
            <div className={cn(
                "p-3 rounded-xl bg-white/5 text-gray-500 group-hover:text-white transition-colors",
                variant === 'danger' && "group-hover:text-red-500"
            )}>
                <Icon size={20} />
            </div>
            <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-white">{title}</h4>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-wider leading-relaxed">{desc}</p>
            </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className={cn(
                "w-12 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:bg-black after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-700 after:rounded-full after:h-4 after:w-4 after:transition-all",
                variant === 'danger' ? "peer-checked:bg-red-500 peer-checked:border-red-500" : "peer-checked:bg-neon-green peer-checked:border-neon-green"
            )}></div>
        </label>
    </div>
);

const InputGroup = ({ label, name, icon: Icon, value, onChange, placeholder }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">{label}</label>
        <div className="relative">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <Input
                name={name}
                value={value || ''}
                onChange={onChange}
                className="h-12 pl-12 bg-black/50 border-white/5 rounded-xl font-medium text-sm"
                placeholder={placeholder}
            />
        </div>
    </div>
);

const FeatureToggle = ({ label, checked, onChange }) => (
    <button 
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
            "p-6 rounded-[2rem] border transition-all duration-500 flex flex-col items-center justify-center gap-4 group",
            checked 
                ? "bg-white/10 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]" 
                : "bg-white/[0.02] border-white/5 opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
        )}
    >
        <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
            checked ? "bg-white text-black" : "bg-white/5 text-gray-500"
        )}>
            {checked ? <Zap size={20} /> : <div className="w-2 h-2 rounded-full bg-gray-500" />}
        </div>
        <span className={cn(
            "text-[10px] font-black uppercase tracking-widest transition-colors",
            checked ? "text-white" : "text-gray-500"
        )}>
            {label}
        </span>
    </button>
);

const MiniToggle = ({ label, checked, onChange }) => (
    <div className="p-4 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/10 transition-all">
        <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-white transition-colors">{label}</span>
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className="w-8 h-4 bg-white/5 border border-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-700 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-500/50 peer-checked:border-red-500/50"></div>
        </label>
    </div>
);

export default SiteSettings;
