import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Save from 'lucide-react/dist/esm/icons/save';
import Users from 'lucide-react/dist/esm/icons/users';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import CityGroupManager from '../../components/admin/CityGroupManager';
import CreatorTestimonialsManager from '../../components/admin/CreatorTestimonialsManager';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const SiteContentManager = () => {
    const { siteDetails, updateSiteDetails, siteSettings, updateGeneralSettings, pastClients, addPastClient, updatePastClient, deletePastClient, uploadToCloudinary } = useStore();
    const navigate = useNavigate();

    useStoreSubscription(['pastClients']);
    const [newClient, setNewClient] = useState({ name: '', logoUrl: '' });
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [formData, setFormData] = useState({ ...siteDetails });

    useEffect(() => {
        if (siteDetails && Object.keys(siteDetails).length > 0) {
            setFormData(prev => {
                // Only sync if form hasn't been modified by user
                const hasUserEdits = Object.keys(prev).some(key => 
                    prev[key] !== '' && prev[key] !== '#' && prev[key] !== false && prev[key] !== undefined
                );
                if (!hasUserEdits) return { ...siteDetails };
                return prev;
            });
        }
    }, [siteDetails]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateSiteDetails(formData);
            useStore.getState().addToast('Site details updated successfully!', 'success');
            navigate('/admin');
        } catch (error) {
            useStore.getState().addToast('Failed to update details.', 'error');
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const url = await uploadToCloudinary(file);
            setNewClient(prev => ({ ...prev, logoUrl: url }));
            useStore.getState().addToast('Logo uploaded!', 'success');
        } catch (err) {
            useStore.getState().addToast('Logo upload failed.', 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleAddClient = async () => {
        if (!newClient.name.trim()) return;
        try {
            await addPastClient(newClient);
            setNewClient({ name: '', logoUrl: '' });
            useStore.getState().addToast('Client added!', 'success');
        } catch (err) {
            useStore.getState().addToast('Failed to add client.', 'error');
        }
    };

    const handleDeleteClient = async (id) => {
        if (!window.confirm('Remove this client?')) return;
        try {
            await deletePastClient(id);
            useStore.getState().addToast('Client removed.', 'success');
        } catch (err) {
            useStore.getState().addToast('Failed to remove client.', 'error');
        }
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'Site',
                subtitle: 'Config',
                icon: Settings,
                accentClass: 'text-neon-green'
            }}
            accentColor="neon-green"
            hideTabs={true}
        >
            <form onSubmit={handleSubmit} className="space-y-16">
                    {/* Critical Control */}
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-red-500">Critical Control</h2>
                            <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
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
                            <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                        </div>

                        <Card className="p-10 bg-gray-100 dark:bg-zinc-900/40 backdrop-blur-3xl border-black/10 dark:border-white/5 rounded-[2.5rem]">
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
                                            className="w-full bg-white dark:bg-black/50 border border-black/10 dark:border-white/5 rounded-xl p-4 pl-12 text-sm font-medium h-24 focus:border-neon-blue/50 outline-none transition-colors"
                                            placeholder="Write a compelling meta description for search engines..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* Feature Control */}
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-neon-green">Feature Control</h2>
                            <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
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
                            <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                        </div>

                        <Card className="p-10 bg-gray-100 dark:bg-zinc-900/40 backdrop-blur-3xl border-black/10 dark:border-white/5 rounded-[2.5rem]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">WhatsApp Community Endpoint</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-green" size={16} />
                                        <Input
                                            name="whatsappCommunity"
                                            value={formData.whatsappCommunity || ''}
                                            onChange={handleChange}
                                            className="h-12 pl-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/5 rounded-xl font-medium"
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
                                            className="w-full bg-white dark:bg-black/50 border border-black/10 dark:border-white/5 rounded-xl p-4 pl-12 text-sm font-medium h-24 focus:border-neon-pink/50 outline-none transition-colors"
                                            placeholder="Full office address..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>


                    {/* Past Clients Manager */}
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4 flex-1">
                                <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-neon-green">Past Clients / Partner Brands</h2>
                                <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                            </div>
                            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900/60 px-4 py-2 rounded-2xl border border-black/10 dark:border-white/10 shadow-sm shrink-0">
                                <div className="flex items-center gap-2">
                                    {siteSettings?.showPastClients !== false ? (
                                        <Eye size={16} className="text-neon-green" />
                                    ) : (
                                        <EyeOff size={16} className="text-gray-400" />
                                    )}
                                    <span className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                        Show on Site
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={siteSettings?.showPastClients !== false}
                                        onChange={(e) => updateGeneralSettings({ showPastClients: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-black/20 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neon-green"></div>
                                </label>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${siteSettings?.showPastClients !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {siteSettings?.showPastClients !== false ? 'Visible' : 'Hidden'}
                                </span>
                            </div>
                        </div>

                        {siteSettings?.showPastClients === false && (
                            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-3 text-xs font-bold">
                                <EyeOff size={16} className="shrink-0" />
                                <span>The Past Clients section is currently hidden from the website (Home &amp; Creator landing pages). Toggle "Show on Site" above to display it.</span>
                            </div>
                        )}

                        <Card className="p-8 bg-gray-100 dark:bg-zinc-900/40 backdrop-blur-3xl border-black/10 dark:border-white/5 rounded-[2.5rem] space-y-8">
                            {/* Add New Client */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Add New Brand</p>
                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    <div className="flex-1 space-y-3">
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                            <Input
                                                value={newClient.name}
                                                onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                                                className="h-12 pl-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/5 rounded-xl font-medium text-sm"
                                                placeholder="Brand name (e.g. Red Bull)"
                                            />
                                        </div>
                                        {newClient.logoUrl && (
                                            <div className="flex items-center gap-3">
                                                <img src={newClient.logoUrl} alt="Preview" className="h-10 w-auto object-contain rounded-lg bg-white p-1 border border-black/10" />
                                                <span className="text-[10px] text-neon-green font-black uppercase tracking-widest">Logo ready</span>
                                            </div>
                                        )}
                                    </div>
                                    <label className="h-12 px-5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all shrink-0">
                                        {uploadingLogo ? 'Uploading...' : <><ImageIcon size={14} /> Upload Logo</>}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                    </label>
                                    <Button
                                        type="button"
                                        onClick={handleAddClient}
                                        disabled={!newClient.name.trim()}
                                        className="h-12 px-6 rounded-xl bg-neon-green text-black font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                                    >
                                        <Plus size={14} /> Add
                                    </Button>
                                </div>
                            </div>

                            {/* Existing Clients */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{pastClients?.length || 0} Brands Listed</p>
                                {(!pastClients || pastClients.length === 0) ? (
                                    <p className="text-sm text-gray-500 font-medium italic">No brands added yet — will show default names.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {pastClients.map(client => (
                                            <div key={client.id} className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    {client.logoUrl ? (
                                                        <img src={client.logoUrl} alt={client.name} className="h-8 w-auto object-contain rounded bg-white p-0.5 border border-black/10" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                                                            <Building2 size={14} className="text-gray-500" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{client.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteClient(client.id)}
                                                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all shrink-0"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </section>

                    {/* City-Wise Creator Groups Section */}
                    <CityGroupManager />

                    {/* Creator Testimonials Section */}
                    <CreatorTestimonialsManager />

                    {/* Footer Actions */}
                    <div className="flex justify-end pt-8 border-t border-black/10 dark:border-white/5">
                        <Button type="submit" className="bg-neon-green text-black font-black font-heading uppercase tracking-widest text-xs h-16 px-16 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(57,255,20,0.3)]">
                            <Save className="mr-3 h-5 w-5" /> Commit Site Configuration
                        </Button>
                    </div>
                </form>
        </AdminCommunityHubLayout>
    );
};

const ToggleCard = ({ title, desc, icon: Icon, checked, onChange, variant = 'primary' }) => (
    <div className={cn(
        "p-6 bg-gray-100 dark:bg-zinc-900/40 backdrop-blur-3xl border border-black/10 dark:border-white/5 rounded-[2rem] flex items-center justify-between group hover:border-black/10 dark:hover:border-white/10 transition-all",
        variant === 'danger' && "hover:border-red-500/30"
    )}>
        <div className="flex items-center gap-5">
            <div className={cn(
                "p-3 rounded-xl bg-black/5 dark:bg-white/5 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors",
                variant === 'danger' && "group-hover:text-red-500"
            )}>
                <Icon size={20} />
            </div>
            <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">{title}</h4>
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
                "w-12 h-6 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:bg-white dark:peer-checked:after:bg-black after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-700 after:rounded-full after:h-4 after:w-4 after:transition-all",
                variant === 'danger' ? "peer-checked:bg-red-500 peer-checked:border-red-500" : "peer-checked:bg-emerald-500 dark:peer-checked:bg-neon-green peer-checked:border-emerald-500 dark:peer-checked:border-neon-green"
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
                className="h-12 pl-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/5 rounded-xl font-medium text-sm"
                placeholder={placeholder}
            />
        </div>
    </div>
);

export default SiteContentManager;
