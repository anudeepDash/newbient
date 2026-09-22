import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Search from 'lucide-react/dist/esm/icons/search';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Mail from 'lucide-react/dist/esm/icons/mail';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Users from 'lucide-react/dist/esm/icons/users';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import BroadcastGroupsModal from './BroadcastGroupsModal';
import AddCityCreatorsModal from './AddCityCreatorsModal';
import CreatorCityGroupCard from '../creator/CreatorCityGroupCard';

const PLATFORM_OPTIONS = [
    { id: 'WhatsApp', label: 'WhatsApp Community', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { id: 'Telegram', label: 'Telegram Channel', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
    { id: 'Discord', label: 'Discord Server', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
    { id: 'Other', label: 'Custom Community', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' }
];

const CityGroupManager = () => {
    useStoreSubscription(['creatorGroups', 'creators']);
    const { creatorGroups, creators, addCreatorGroup, updateCreatorGroup, deleteCreatorGroup, seedDefaultCreatorGroups } = useStore();

    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [managingCityGroup, setManagingCityGroup] = useState(null);
    const [isSyncingDefaults, setIsSyncingDefaults] = useState(false);

    const [form, setForm] = useState({
        city: 'Bengaluru',
        customCity: '',
        platform: 'WhatsApp',
        title: '',
        groupUrl: '',
        description: '',
        isActive: true
    });
    const [previewCity, setPreviewCity] = useState('Bengaluru');
    const [submitting, setSubmitting] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [filterQuery, setFilterQuery] = useState('');

    const handleAddGroup = async (e) => {
        if (e) e.preventDefault();
        const targetCity = form.city === 'Others' ? form.customCity.trim() : form.city;
        if (!targetCity) {
            useStore.getState().addToast('Please select or specify a city.', 'error');
            return;
        }
        if (!form.groupUrl.trim()) {
            useStore.getState().addToast('Please provide a valid group invite link.', 'error');
            return;
        }

        // Basic URL check
        if (!/^https?:\/\//i.test(form.groupUrl.trim())) {
            useStore.getState().addToast('Link must begin with http:// or https://', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await addCreatorGroup({
                city: targetCity,
                platform: form.platform,
                title: form.title.trim() || `${targetCity} Creators Community`,
                groupUrl: form.groupUrl.trim(),
                description: form.description.trim() || `Official ${targetCity} hub for brand campaigns, concert invites & meetups.`,
                isActive: form.isActive !== false
            });

            setPreviewCity(targetCity);
            setForm({
                city: 'Bengaluru',
                customCity: '',
                platform: 'WhatsApp',
                title: '',
                groupUrl: '',
                description: '',
                isActive: true
            });
            useStore.getState().addToast(`${targetCity} Creator Group added!`, 'success');
        } catch (err) {
            console.error('Error adding creator group:', err);
            useStore.getState().addToast('Failed to add creator group.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, city) => {
        if (!window.confirm(`Delete the creator group for ${city}?`)) return;
        try {
            await deleteCreatorGroup(id);
            useStore.getState().addToast('Creator group removed.', 'success');
        } catch (err) {
            useStore.getState().addToast('Failed to delete group.', 'error');
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await updateCreatorGroup(id, { isActive: !currentStatus });
            useStore.getState().addToast(`Group marked ${!currentStatus ? 'Active' : 'Inactive'}.`, 'info');
        } catch (err) {
            useStore.getState().addToast('Failed to update group status.', 'error');
        }
    };

    const handleCopy = (url, id) => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        useStore.getState().addToast('Invite link copied!', 'success');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSyncDefaults = async () => {
        if (!window.confirm('Sync and push all 8 official WhatsApp community groups to Firestore?')) return;
        setIsSyncingDefaults(true);
        try {
            if (seedDefaultCreatorGroups) {
                await seedDefaultCreatorGroups();
            }
            useStore.getState().addToast('Successfully synced 8 official city groups to Firestore!', 'success');
        } catch (err) {
            console.error('Error syncing groups:', err);
            useStore.getState().addToast('Failed to sync groups to database.', 'error');
        } finally {
            setIsSyncingDefaults(false);
        }
    };

    const filteredGroups = (creatorGroups || []).filter(g => {
        if (!filterQuery.trim()) return true;
        const q = filterQuery.toLowerCase();
        return (
            g.city?.toLowerCase().includes(q) ||
            g.title?.toLowerCase().includes(q) ||
            g.platform?.toLowerCase().includes(q)
        );
    });

    return (
        <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-xl font-black font-heading tracking-tight uppercase italic text-neon-blue flex items-center gap-2">
                        <MapPin size={20} className="text-neon-blue" />
                        City-Wise Creator Groups
                    </h2>
                    <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        type="button"
                        onClick={() => setManagingCityGroup(form.city === 'Others' ? (form.customCity || 'Bengaluru') : form.city)}
                        className="h-10 px-4 rounded-xl bg-neon-blue/10 border border-neon-blue/30 text-neon-blue font-black text-[10px] uppercase tracking-wider hover:bg-neon-blue/20 flex items-center gap-1.5 transition-all"
                        title="Bulk add creators of any city to WhatsApp group"
                    >
                        <UserPlus size={13} />
                        <span>Add Creators to Group</span>
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setIsBroadcastModalOpen(true)}
                        className="h-10 px-4 rounded-xl bg-[#25D366] text-black font-black text-[10px] uppercase tracking-wider hover:brightness-110 flex items-center gap-1.5 shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                    >
                        <Mail size={13} />
                        <span>Broadcast via Email</span>
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSyncDefaults}
                        disabled={isSyncingDefaults}
                        variant="outline"
                        className="h-10 px-3.5 rounded-xl border-black/10 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5"
                        title="Sync all 8 official WhatsApp groups to database"
                    >
                        <RefreshCw size={13} className={isSyncingDefaults ? 'animate-spin' : ''} />
                        <span>Sync 8 Hubs</span>
                    </Button>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 dark:text-zinc-400 bg-black/[0.04] dark:bg-white/[0.05] px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 shrink-0">
                        {creatorGroups?.length || 0} Cities
                    </div>
                </div>
            </div>

            <Card className="p-6 sm:p-8 bg-gray-100 dark:bg-zinc-900/40 backdrop-blur-3xl border-black/10 dark:border-white/5 rounded-[2.5rem] space-y-8">
                {/* Creation Form */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Add City Group &amp; Invite Link
                        </p>
                        <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                            Shows at end of registration and in creator dashboard until joined
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* City Select */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Target City
                            </label>
                            <div className="relative">
                                <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={form.city}
                                    onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                                    className="w-full h-12 pl-11 pr-4 bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-neon-blue"
                                >
                                    {PREDEFINED_CITIES.map(c => (
                                        <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Custom City (if 'Others') */}
                        {form.city === 'Others' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                    Custom City Name
                                </label>
                                <Input
                                    value={form.customCity}
                                    onChange={(e) => setForm(prev => ({ ...prev, customCity: e.target.value }))}
                                    placeholder="Enter city name..."
                                    className="h-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-bold"
                                />
                            </div>
                        )}

                        {/* Platform Select */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Community Platform
                            </label>
                            <div className="relative">
                                <MessageSquare size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={form.platform}
                                    onChange={(e) => setForm(prev => ({ ...prev, platform: e.target.value }))}
                                    className="w-full h-12 pl-11 pr-4 bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-neon-blue"
                                >
                                    {PLATFORM_OPTIONS.map(p => (
                                        <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Group Title */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Group Title (Optional)
                            </label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder={`${form.city === 'Others' ? 'City' : form.city} Creators Hub`}
                                className="h-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-medium"
                            />
                        </div>

                        {/* Group Invite Link */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Group Invite Link (WhatsApp / Telegram / etc.)
                            </label>
                            <div className="relative">
                                <Link2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <Input
                                    value={form.groupUrl}
                                    onChange={(e) => setForm(prev => ({ ...prev, groupUrl: e.target.value }))}
                                    placeholder="https://chat.whatsapp.com/..."
                                    className="h-12 pl-11 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-mono"
                                />
                            </div>
                        </div>

                        {/* Description / Welcome Note */}
                        <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Member Welcome Note / Scope
                            </label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Exclusive city drops, gig alerts & local creator meetups."
                                className="h-12 bg-white dark:bg-black/50 border-black/10 dark:border-white/10 rounded-xl text-xs font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="button"
                            onClick={handleAddGroup}
                            disabled={submitting || !form.groupUrl.trim()}
                            className="h-11 px-6 rounded-xl bg-neon-blue text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-2"
                        >
                            <Plus size={14} /> Add City Group
                        </Button>
                    </div>
                </div>

                {/* Existing Groups List */}
                <div className="space-y-4 pt-6 border-t border-black/10 dark:border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Active City Groups ({filteredGroups.length})
                        </p>
                        <div className="relative w-full sm:w-64">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder="Filter by city or title..."
                                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-neon-blue"
                            />
                        </div>
                    </div>

                    {filteredGroups.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 space-y-1">
                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                                {creatorGroups?.length === 0 ? "No city creator groups added yet." : "No groups match your filter."}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">
                                Add groups above to automatically route creators to their city hub on WhatsApp or Telegram.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {filteredGroups.map(group => {
                                const platformInfo = PLATFORM_OPTIONS.find(p => p.id === group.platform) || PLATFORM_OPTIONS[0];
                                const cityCreatorCount = (creators || []).filter(c => {
                                    const normC = (c.city || '').toLowerCase().trim();
                                    const normG = (group.city || '').toLowerCase().trim();
                                    return normC === normG || (normG === 'bengaluru' && /bang[al]*o?re/i.test(normC)) || normC.includes(normG);
                                }).length;

                                return (
                                    <div
                                        key={group.id}
                                        className={cn(
                                            "p-4 rounded-2xl bg-white dark:bg-black/30 border transition-all flex flex-col justify-between gap-3",
                                            group.isActive !== false ? "border-black/10 dark:border-white/10" : "border-red-500/20 opacity-60"
                                        )}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black dark:bg-white/10 text-white dark:text-white">
                                                        {group.city}
                                                    </span>
                                                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border", platformInfo.color)}>
                                                        {group.platform || 'Community'}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(group.id, group.isActive !== false)}
                                                    className={cn(
                                                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all flex items-center gap-1",
                                                        group.isActive !== false 
                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                                                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                                                    )}
                                                >
                                                    {group.isActive !== false ? <><Eye size={10} /> Active</> : <><EyeOff size={10} /> Inactive</>}
                                                </button>
                                            </div>

                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                {group.title || `${group.city} Creators Hub`}
                                            </h4>
                                            {group.description && (
                                                <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                                    {group.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 truncate">
                                                <a
                                                    href={group.groupUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-neon-blue hover:underline truncate"
                                                >
                                                    <ExternalLink size={12} className="shrink-0" />
                                                    <span className="truncate max-w-[150px] font-mono">{group.groupUrl}</span>
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setManagingCityGroup(group.city)}
                                                    className="h-8 px-2.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-[#25D366]/20"
                                                    title={`Add all ${group.city} creators to WhatsApp`}
                                                >
                                                    <UserPlus size={12} />
                                                    <span>Add Creators ({cityCreatorCount})</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(group.groupUrl, group.id)}
                                                    className="h-8 px-2.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                                    title="Copy Invite Link"
                                                >
                                                    {copiedId === group.id ? <><Check size={12} className="text-neon-green" /> Copied</> : <><Copy size={12} /> Copy</>}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(group.id, group.city)}
                                                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors"
                                                    title="Delete Group"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>

            {/* Live Interactive Creator Banner Preview */}
            <div className="space-y-3 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Live Creator View &bull; Clean City Community Banner Preview
                        </p>
                        <span className="text-[10px] font-mono text-neon-green">
                            Previewing banner for: <strong>{previewCity}</strong>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Preview City:</span>
                        <select
                            value={previewCity}
                            onChange={(e) => setPreviewCity(e.target.value)}
                            className="h-8 px-2.5 rounded-lg bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-neon-blue"
                        >
                            {PREDEFINED_CITIES.filter(c => c !== 'Others').map(c => (
                                <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                    {c}
                                </option>
                            ))}
                            {(creatorGroups || []).filter(g => g.city && !PREDEFINED_CITIES.includes(g.city)).map(g => (
                                <option key={g.city} value={g.city} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                    {g.city}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <CreatorCityGroupCard initialCity={previewCity} />
            </div>

            {/* Email Broadcast Modal */}
            {isBroadcastModalOpen && (
                <BroadcastGroupsModal
                    onClose={() => setIsBroadcastModalOpen(false)}
                />
            )}

            {/* Add City Creators to WhatsApp Modal */}
            {managingCityGroup && (
                <AddCityCreatorsModal
                    isOpen={Boolean(managingCityGroup)}
                    initialCity={managingCityGroup}
                    onClose={() => setManagingCityGroup(null)}
                />
            )}
        </section>
    );
};

export default CityGroupManager;
