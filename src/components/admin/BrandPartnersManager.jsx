import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';

const BrandPartnersManager = () => {
    useStoreSubscription(['pastClients', 'siteSettings']);
    const {
        pastClients,
        siteSettings,
        updateGeneralSettings,
        addPastClient,
        deletePastClient,
        uploadToCloudinary
    } = useStore();

    const [newClient, setNewClient] = useState({ name: '', logoUrl: '', websiteUrl: '' });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isSectionVisible = siteSettings?.showPastClients !== false;

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const url = await uploadToCloudinary(file);
            setNewClient(prev => ({ ...prev, logoUrl: url }));
            useStore.getState().addToast('Brand logo uploaded!', 'success');
        } catch (err) {
            console.error('Logo upload error:', err);
            useStore.getState().addToast('Failed to upload logo image.', 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleAddClient = async (e) => {
        if (e) e.preventDefault();
        if (!newClient.name.trim()) {
            useStore.getState().addToast('Brand name is required.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await addPastClient({
                name: newClient.name.trim(),
                logoUrl: newClient.logoUrl.trim(),
                websiteUrl: newClient.websiteUrl?.trim() || ''
            });
            setNewClient({ name: '', logoUrl: '', websiteUrl: '' });
            useStore.getState().addToast('Brand partner added!', 'success');
        } catch (err) {
            console.error('Add brand error:', err);
            useStore.getState().addToast('Failed to add brand partner.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClient = async (id, name) => {
        if (!window.confirm(`Remove ${name || 'this brand'} from partners?`)) return;
        try {
            await deletePastClient(id);
            useStore.getState().addToast('Brand partner removed.', 'success');
        } catch (err) {
            useStore.getState().addToast('Failed to delete brand partner.', 'error');
        }
    };

    const handleToggleVisibility = async () => {
        const nextState = !isSectionVisible;
        try {
            await updateGeneralSettings({ showPastClients: nextState });
            useStore.getState().addToast(
                `Brand partners marquee is now ${nextState ? 'visible' : 'hidden'} on landing pages.`,
                'info'
            );
        } catch (err) {
            useStore.getState().addToast('Failed to update visibility setting.', 'error');
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-xl font-black font-heading tracking-tight uppercase text-emerald-600 dark:text-neon-green flex items-center gap-2">
                        <Building2 size={20} className="text-emerald-600 dark:text-neon-green" />
                        Brand Partners &amp; Clients
                    </h2>
                    <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleToggleVisibility}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm",
                            isSectionVisible
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                        )}
                    >
                        {isSectionVisible ? <><Eye size={12} /> Marquee: Visible</> : <><EyeOff size={12} /> Marquee: Hidden</>}
                    </button>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 dark:text-zinc-400 bg-black/[0.04] dark:bg-white/[0.05] px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10">
                        {pastClients?.length || 0} Brands
                    </div>
                </div>
            </div>

            {!isSectionVisible && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-3 text-xs font-bold">
                    <EyeOff size={16} className="shrink-0" />
                    <span>The Brand Partners marquee is currently hidden from both the Creator landing page and Home page. Click &quot;Marquee: Hidden&quot; above to re-enable it.</span>
                </div>
            )}

            <Card className="p-5 sm:p-8 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl space-y-8 shadow-sm">
                {/* Add New Brand */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Add New Partner Brand
                        </p>
                        <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                            Brands loop continuously on creator &amp; home landing pages
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                        {/* Brand Name */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Brand / Client Name
                            </label>
                            <div className="relative">
                                <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <Input
                                    value={newClient.name}
                                    onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Red Bull or Spotify"
                                    className="h-12 pl-11 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        {/* Website URL (optional) */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Website (Optional)
                            </label>
                            <div className="relative">
                                <ExternalLink size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <Input
                                    value={newClient.websiteUrl}
                                    onChange={(e) => setNewClient(prev => ({ ...prev, websiteUrl: e.target.value }))}
                                    placeholder="https://brand.com"
                                    className="h-12 pl-11 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-mono"
                                />
                            </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Logo Image (PNG / SVG / WebP)
                            </label>
                            <div className="space-y-2">
                                <label className="h-12 w-full px-4 rounded-xl bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    {uploadingLogo ? 'Uploading...' : <><ImageIcon size={15} /> Upload Logo</>}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                </label>
                                {newClient.logoUrl && (
                                    <div className="flex items-center gap-2">
                                        <img src={newClient.logoUrl} alt="Preview" className="h-6 w-auto max-w-[80px] object-contain rounded bg-white p-0.5 border border-black/10" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-neon-green">Ready</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                            <label className="text-[10px] font-black uppercase tracking-wider text-transparent select-none hidden lg:block">
                                Action
                            </label>
                            <Button
                                type="button"
                                onClick={handleAddClient}
                                disabled={submitting || !newClient.name.trim()}
                                className="h-12 px-6 rounded-xl bg-neon-green text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Plus size={14} /> Add Brand
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Existing Brands Grid */}
                <div className="space-y-4 pt-6 border-t border-black/10 dark:border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Configured Brands ({pastClients?.length || 0})
                    </p>

                    {(!pastClients || pastClients.length === 0) ? (
                        <div className="p-8 text-center rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                                No custom brands added yet.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">
                                The landing page marquee currently falls back to the default partners roster (Spotify, Red Bull, Levi&apos;s, etc.). Adding brands here replaces the fallback.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                            {pastClients.map(client => (
                                <div
                                    key={client.id}
                                    className="p-3.5 rounded-2xl bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] flex flex-col items-center justify-between gap-3 text-center group hover:border-black/20 dark:hover:border-white/20 transition-all shadow-sm"
                                >
                                    <div className="h-12 w-full flex items-center justify-center p-1">
                                        {client.logoUrl ? (
                                            <img
                                                src={client.logoUrl}
                                                alt={client.name}
                                                className="max-h-10 max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-500">
                                                <Building2 size={18} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                            {client.name}
                                        </p>
                                        {client.websiteUrl && (
                                            <a
                                                href={client.websiteUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] text-sky-600 dark:text-neon-blue hover:underline truncate block"
                                            >
                                                {client.websiteUrl.replace(/^https?:\/\//, '')}
                                            </a>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteClient(client.id, client.name)}
                                        className="w-full py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                        title="Remove Brand"
                                    >
                                        <Trash2 size={12} /> Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </section>
    );
};

export default BrandPartnersManager;
