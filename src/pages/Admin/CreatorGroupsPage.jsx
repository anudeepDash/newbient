import React, { useMemo, useState } from 'react';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Mail from 'lucide-react/dist/esm/icons/mail';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Users from 'lucide-react/dist/esm/icons/users';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { copyToClipboard } from '../../lib/clipboard';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { Card, Button, Badge, SearchInput, EmptyState, Menu, MenuItem } from '../../components/admin/ui';
import Sheet from '../../components/admin/Sheet';
import AddCityCreatorsModal from '../../components/admin/AddCityCreatorsModal';
import BroadcastGroupsModal from '../../components/admin/BroadcastGroupsModal';
import ThemedSelect from '../../components/admin/ThemedSelect';

/*
 * One place for city communities: the groups themselves, inviting creators to
 * them over WhatsApp, and emailing announcements. (These used to be split
 * between the Creators "More" menu and Settings → City groups.)
 */

const PLATFORMS = ['WhatsApp', 'Telegram', 'Discord', 'Other'];
const field = 'h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[15px] font-semibold outline-none focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white';
const EMPTY_FORM = { city: 'Bengaluru', customCity: '', platform: 'WhatsApp', title: '', groupUrl: '', description: '', isActive: true };

const normaliseCity = (c) => String(c || '').trim().toLowerCase().replace(/^bangalore$/, 'bengaluru');

const GroupForm = ({ open, onClose, editing, initialCity }) => {
    const addToast = useStore(s => s.addToast);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!open) return;
        setError('');
        if (editing) {
            const known = PREDEFINED_CITIES.includes(editing.city);
            setForm({
                city: known ? editing.city : 'Others',
                customCity: known ? '' : editing.city || '',
                platform: editing.platform || 'WhatsApp',
                title: editing.title || '',
                groupUrl: editing.groupUrl || '',
                description: editing.description || '',
                isActive: editing.isActive !== false,
            });
        } else if (initialCity) {
            // From a "no group yet" city: fill the city in, so only the link is left.
            const known = PREDEFINED_CITIES.find(c => c.toLowerCase() === initialCity.toLowerCase());
            const name = initialCity.replace(/\b\w/g, ch => ch.toUpperCase());
            setForm({ ...EMPTY_FORM, city: known || 'Others', customCity: known ? '' : name });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [open, editing, initialCity]);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        const city = form.city === 'Others' ? form.customCity.trim() : form.city;
        if (!city) return setError('Choose a city or type one in.');
        if (!/^https?:\/\//i.test(form.groupUrl.trim())) return setError('Paste the full invite link, starting with https://');
        const payload = {
            city,
            platform: form.platform,
            title: form.title.trim() || `${city} Creators Community`,
            groupUrl: form.groupUrl.trim(),
            description: form.description.trim() || `Official ${city} hub for brand campaigns, concert invites and meetups.`,
            isActive: form.isActive,
        };
        setSaving(true);
        try {
            if (editing) await useStore.getState().updateCreatorGroup(editing.id, payload);
            else await useStore.getState().addCreatorGroup(payload);
            addToast(editing ? 'Group updated.' : `${city} group added.`, 'success');
            onClose();
        } catch (err) {
            console.error(err);
            setError("Couldn't save the group. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            variant="dialog"
            size="sm"
            title={editing ? `Edit ${editing.city} group` : initialCity ? `Add the ${initialCity.replace(/\b\w/g, ch => ch.toUpperCase())} group` : 'Add a city group'}
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
                    <Button variant="primary" type="submit" form="group-form" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save group'}</Button>
                </div>
            )}
        >
            <form id="group-form" onSubmit={submit} className="space-y-3" noValidate>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">City</span>
                        <ThemedSelect className={field} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
                            {PREDEFINED_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="Others">Other city…</option>
                        </ThemedSelect>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Platform</span>
                        <ThemedSelect className={field} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </ThemedSelect>
                    </label>
                </div>
                {form.city === 'Others' && (
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">City name</span>
                        <input className={field} value={form.customCity} onChange={e => setForm({ ...form, customCity: e.target.value })} />
                    </label>
                )}
                <label className="block">
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">Invite link</span>
                    <input className={field} type="url" inputMode="url" autoFocus={Boolean(initialCity)} value={form.groupUrl} onChange={e => setForm({ ...form, groupUrl: e.target.value })} placeholder="https://chat.whatsapp.com/…" autoCapitalize="off" />
                </label>
                <label className="block">
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">Group name <span className="font-medium">(optional)</span></span>
                    <input className={field} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={`${form.city === 'Others' ? form.customCity || 'City' : form.city} Creators Community`} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">Description <span className="font-medium">(optional)</span></span>
                    <textarea className={cn(field, 'h-auto py-3 font-medium')} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </label>
                <label className="flex items-center gap-2 text-[14px] font-semibold">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="h-5 w-5 accent-emerald-500" />
                    Show this group to creators
                </label>
                {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
            </form>
        </Sheet>
    );
};

const CreatorGroupsPage = () => {
    useStoreSubscription(['creatorGroups', 'creators']);
    const groups = useStore(s => s.creatorGroups) || [];
    const creators = useStore(s => s.creators) || [];
    const addToast = useStore(s => s.addToast);

    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [newCity, setNewCity] = useState(null);
    const [inviteCity, setInviteCity] = useState(null);
    const [broadcastCity, setBroadcastCity] = useState(null);
    const [seeding, setSeeding] = useState(false);

    // Verified creators per city, to show how many each group could reach.
    const creatorsByCity = useMemo(() => {
        const map = {};
        creators.forEach(c => {
            if (c.profileStatus !== 'approved') return;
            const key = normaliseCity(c.city);
            if (key) map[key] = (map[key] || 0) + 1;
        });
        return map;
    }, [creators]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return groups
            .filter(g => !q || [g.city, g.title, g.platform].some(v => String(v || '').toLowerCase().includes(q)))
            .sort((a, b) => (creatorsByCity[normaliseCity(b.city)] || 0) - (creatorsByCity[normaliseCity(a.city)] || 0));
    }, [groups, search, creatorsByCity]);

    const citiesWithoutGroup = useMemo(() => {
        const covered = new Set(groups.map(g => normaliseCity(g.city)));
        return Object.entries(creatorsByCity).filter(([city]) => !covered.has(city)).sort((a, b) => b[1] - a[1]).slice(0, 6);
    }, [groups, creatorsByCity]);

    const copy = async (url) => {
        const ok = await copyToClipboard(url);
        addToast(ok ? 'Invite link copied.' : "Couldn't copy the invite link. Try again.", ok ? 'success' : 'error');
    };
    const toggleActive = async (g) => {
        try {
            await useStore.getState().updateCreatorGroup(g.id, { isActive: g.isActive === false });
            addToast(g.isActive === false ? `${g.city} group is visible again.` : `${g.city} group hidden from creators.`, 'success');
        } catch {
            addToast('Check your connection and try again.', 'error', {
                title: g.isActive === false ? `Couldn't show the ${g.city} group` : `Couldn't hide the ${g.city} group`,
                action: { label: 'Try again', onClick: () => toggleActive(g) },
            });
        }
    };
    const remove = async (g) => {
        if (!window.confirm(`Delete the ${g.city} group? Creators will no longer see its invite link.`)) return;
        try {
            await useStore.getState().deleteCreatorGroup(g.id);
            addToast('Group deleted.', 'success');
        } catch {
            addToast('Check your connection and try again.', 'error', {
                title: `${g.city} group not deleted`,
                action: { label: 'Try again', onClick: () => remove(g) },
            });
        }
    };
    const seed = async () => {
        if (!window.confirm('Add the 8 official city WhatsApp groups? Existing groups are kept.')) return;
        setSeeding(true);
        try {
            await useStore.getState().seedDefaultCreatorGroups?.();
            addToast('Official city groups added.', 'success');
        } catch {
            addToast('Check your connection and try again.', 'error', {
                title: "Couldn't add the official groups",
                action: { label: 'Try again', onClick: () => seed() },
            });
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput value={search} onChange={setSearch} placeholder="Search cities or groups" className="lg:w-80" />
                <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
                    <Button variant="secondary" onClick={() => setInviteCity('Bengaluru')}><UserPlus size={14} /> Invite creators</Button>
                    <Button variant="secondary" onClick={() => setBroadcastCity('All')}><Mail size={14} /> Email groups</Button>
                    <Button variant="primary" onClick={() => { setEditing(null); setNewCity(null); setFormOpen(true); }}><Plus size={14} /> Add group</Button>
                    <Menu trigger={({ toggle }) => <Button variant="ghost" onClick={toggle} aria-label="More" className="w-10 px-0"><MoreHorizontal size={16} /></Button>}>
                        <MenuItem icon={RefreshCw} onClick={seed} disabled={seeding} hint="Adds the 8 official WhatsApp hubs">Add official groups</MenuItem>
                    </Menu>
                </div>
            </div>

            {citiesWithoutGroup.length > 0 && (
                <Card className="rounded-2xl border-amber-500/25 bg-amber-500/[0.05] p-4 dark:border-amber-500/25 dark:bg-amber-500/[0.05]">
                    <p className="text-sm font-bold">Cities with verified creators but no group</p>
                    <p className="mt-0.5 text-[12px] text-gray-500">Tap a city to add its WhatsApp invite link. It shows on the app’s Community page and creator dashboard within a few minutes.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {citiesWithoutGroup.map(([city, n]) => (
                            <button key={city} type="button" onClick={() => { setEditing(null); setNewCity(city === 'others' ? null : city); setFormOpen(true); }} className="flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1 text-[12px] font-semibold capitalize hover:border-neon-green/60 hover:bg-neon-green/10 dark:border-white/10">
                                <Plus size={12} /> {city} · {n}
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {visible.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState icon={MessageCircle} title={groups.length ? 'No matching groups' : 'No city groups yet'}
                        description={groups.length ? 'Try another search.' : 'Add a WhatsApp community link for each city so creators can join it.'}
                        action={!groups.length && <Button variant="primary" onClick={seed} disabled={seeding}><RefreshCw size={14} /> Add official groups</Button>} />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map(g => {
                        const reach = creatorsByCity[normaliseCity(g.city)] || 0;
                        const hidden = g.isActive === false;
                        return (
                            <Card key={g.id} className={cn('flex flex-col rounded-2xl p-4', hidden && 'opacity-70')}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge tone={g.platform === 'WhatsApp' ? 'green' : g.platform === 'Telegram' ? 'blue' : 'violet'}>{g.platform || 'WhatsApp'}</Badge>
                                        {hidden && <Badge tone="gray">Hidden</Badge>}
                                    </div>
                                    <Menu trigger={({ toggle }) => <Button size="sm" variant="ghost" onClick={toggle} aria-label="Group actions" className="w-9 px-0"><MoreHorizontal size={15} /></Button>}>
                                        <MenuItem icon={Pencil} onClick={() => { setEditing(g); setNewCity(null); setFormOpen(true); }}>Edit</MenuItem>
                                        <MenuItem icon={Mail} onClick={() => setBroadcastCity(g.city)}>Email this group</MenuItem>
                                        <MenuItem onClick={() => toggleActive(g)}>{hidden ? 'Show to creators' : 'Hide from creators'}</MenuItem>
                                        <MenuItem icon={Trash2} danger onClick={() => remove(g)}>Delete</MenuItem>
                                    </Menu>
                                </div>
                                <p className="mt-2 flex items-center gap-1.5 text-[17px] font-extrabold"><MapPin size={15} className="text-gray-400" />{g.city}</p>
                                <p className="truncate text-[13px] text-gray-500">{g.title}</p>
                                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-500"><Users size={12} /> {reach} verified {reach === 1 ? 'creator' : 'creators'} in {g.city}</p>
                                <div className="mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                    <Button size="sm" variant="primary" onClick={() => setInviteCity(g.city)} className="flex-1"><UserPlus size={13} /> Invite creators</Button>
                                    <Button size="sm" variant="secondary" onClick={() => copy(g.groupUrl)} aria-label="Copy invite link" className="w-9 px-0"><Copy size={14} /></Button>
                                    <Button size="sm" as="a" href={g.groupUrl} target="_blank" rel="noopener noreferrer" variant="secondary" aria-label="Open group" className="w-9 px-0"><ExternalLink size={14} /></Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <GroupForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} initialCity={newCity} />
            {inviteCity && <AddCityCreatorsModal isOpen initialCity={inviteCity} onClose={() => setInviteCity(null)} />}
            {broadcastCity && <BroadcastGroupsModal preselectedCity={broadcastCity} onClose={() => setBroadcastCity(null)} />}
        </div>
    );
};

export default CreatorGroupsPage;
