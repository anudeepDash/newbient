import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Save, Users, Globe, Settings, Bell, Shield, Sparkles, Zap, Heart, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const SiteContentManager = () => {
    const { siteDetails, updateSiteDetails, siteSettings, updateGeneralSettings } = useStore();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ ...siteDetails });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateSiteDetails(formData);
            alert('Site details updated successfully!');
            navigate('/admin');
        } catch (error) {
            alert('Failed to update details.');
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-5%] w-[40%] h-[40%] bg-neon-green/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 md:pt-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div className="space-y-2">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] mb-4 group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO COMMAND CENTRE
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            SITE <span className="text-neon-green">CONFIG.</span>
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-16">
                    {/* Critical Control */}
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-red-500">Critical Control</h2>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ToggleCard 
                                title="Global Maintenance" 
                                desc="Lock the entire site for visitors. Admins maintain access." 
                                icon={Shield}
                                checked={siteSettings.globalMaintenance === true}
                                onChange={(val) => updateGeneralSettings({ globalMaintenance: val })}
                                variant="danger"
                            />
                            <ToggleCard 
                                title="Stealth Maintenance" 
                                desc="Hide inactive pages from Navigation menus." 
                                icon={Globe}
                                checked={siteSettings.hideMaintenancePages === true}
                                onChange={(val) => updateGeneralSettings({ hideMaintenancePages: val })}
                            />
                        </div>
                    </section>

                    {/* Site Identity */}
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-neon-blue">Site Identity</h2>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        <Card className="p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <InputGroup label="Site Title" name="title" icon={Settings} value={formData.title} onChange={handleChange} placeholder="Newbi | Disrupting Marketing" />
                                <InputGroup label="Tagline" name="tagline" icon={Sparkles} value={formData.tagline} onChange={handleChange} placeholder="The future of creator marketing" />
                                
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">SEO Description</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-4 text-gray-500" size={16} />
                                        <textarea
                                            name="description"
                                            value={formData.description || ''}
                                            onChange={handleChange}
                                            className="w-full bg-black/50 border border-white/5 rounded-xl p-4 pl-12 text-sm font-medium h-24 focus:border-neon-blue/50 outline-none transition-colors"
                                            placeholder="Write a compelling meta description for search engines..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* System Intelligence */}
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-neon-green">Feature Control</h2>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ToggleCard 
                                title="Tribe Intake Form" 
                                desc="Enable Step 1 Google Form for new members." 
                                icon={Heart}
                                checked={siteSettings.enableTribeForm !== false}
                                onChange={(val) => updateGeneralSettings({ enableTribeForm: val })}
                            />
                            <ToggleCard 
                                title="Client Showcase" 
                                desc="Display the animated past clients marquee." 
                                icon={Zap}
                                checked={siteSettings.showPastClients !== false}
                                onChange={(val) => updateGeneralSettings({ showPastClients: val })}
                            />
                            <ToggleCard 
                                title="Creator Insights" 
                                desc="Show campaign stats in Creator Hub dashboard." 
                                icon={Sparkles}
                                checked={siteSettings.showCreatorStats !== false}
                                onChange={(val) => updateGeneralSettings({ showCreatorStats: val })}
                            />
                        </div>
                    </section>

                    {/* Contact & Socials */}
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-neon-pink">Communication Endpoint</h2>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        <Card className="p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">WhatsApp Community Endpoint</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-green" size={16} />
                                        <Input
                                            name="whatsappCommunity"
                                            value={formData.whatsappCommunity || ''}
                                            onChange={handleChange}
                                            className="h-12 pl-12 bg-black/50 border-white/5 rounded-xl font-medium"
                                            placeholder="https://chat.whatsapp.com/..."
                                        />
                                    </div>
                                </div>

                                <InputGroup label="Official Phone" name="phone" icon={Phone} value={formData.phone} onChange={handleChange} placeholder="+91..." />
                                <InputGroup label="Corporate Email" name="email" icon={Mail} value={formData.email} onChange={handleChange} placeholder="hello@newbi.live" />
                                <InputGroup label="Instagram Handle" name="instagram" icon={Instagram} value={formData.instagram} onChange={handleChange} placeholder="Handle or URL" />
                                <InputGroup label="LinkedIn Profile" name="linkedin" icon={Linkedin} value={formData.linkedin} onChange={handleChange} placeholder="Handle or URL" />
                                
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">HQ Physical Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-4 text-gray-500" size={16} />
                                        <textarea
                                            name="address"
                                            value={formData.address || ''}
                                            onChange={handleChange}
                                            className="w-full bg-black/50 border border-white/5 rounded-xl p-4 pl-12 text-sm font-medium h-24 focus:border-neon-pink/50 outline-none transition-colors"
                                            placeholder="Full office address..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* Footer Actions */}
                    <div className="flex justify-end pt-8 border-t border-white/5">
                        <Button type="submit" className="bg-neon-green text-black font-black font-heading uppercase tracking-widest text-xs h-16 px-16 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(57,255,20,0.3)]">
                            <Save className="mr-3 h-5 w-5" /> Commit Site Configuration
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ToggleCard = ({ title, desc, icon: Icon, checked, onChange, variant = 'primary' }) => (
    <div className={cn(
        "p-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] flex items-center justify-between group hover:border-white/10 transition-all",
        variant === 'danger' && "hover:border-red-500/30"
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

export default SiteContentManager;
