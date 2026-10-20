import React, { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Sheet from './Sheet';
import { accent } from './theme';
import { Button, EmptyState, Menu, MenuItem } from './ui';
import { Field, Toggle, fieldCls } from './uploads/UploadKit';
import { ImageSlot } from './events/EditorParts';
import ConfirmSheet from './creators/ConfirmSheet';
import { uploadImage, normaliseUrl, moveItem } from './creators/uploadImage';

/*
 * Brand partner logos for the marquee on the creator page and home page:
 * add, edit, reorder and remove, plus the switch that shows the marquee.
 */

const EMPTY_FORM = { name: '', logoUrl: '', websiteUrl: '' };

const LogoTile = ({ client, className }) => (
    <div className={cn('flex items-center justify-center rounded-xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.08]', className)}>
        {client.logoUrl ? (
            <img src={client.logoUrl} alt={client.name || ''} className="max-h-full max-w-full object-contain" loading="lazy" />
        ) : (
            <span className="text-center text-[15px] font-extrabold text-gray-700">{client.name || 'Brand'}</span>
        )}
    </div>
);

const BrandEditor = ({ open, editing, onClose }) => {
    const addToast = useStore(s => s.addToast);
    const [form, setForm] = useState(EMPTY_FORM);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setForm(editing ? { name: editing.name || '', logoUrl: editing.logoUrl || '', websiteUrl: editing.websiteUrl || '' } : EMPTY_FORM);
    }, [open, editing]);

    const set = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

    const pickLogo = async (file) => {
        setError('');
        setUploading(true);
        try {
            set('logoUrl')(await uploadImage(file));
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (saving || uploading) return;
        if (!form.name.trim()) return setError('Add the brand name.');
        const website = normaliseUrl(form.websiteUrl);
        if (website === null) return setError('That website link looks wrong. Try something like brand.com.');
        setError('');
        const payload = { name: form.name.trim(), logoUrl: form.logoUrl.trim(), websiteUrl: website };
        setSaving(true);
        try {
            if (editing) await useStore.getState().updatePastClient(editing.id, payload);
            else await useStore.getState().addPastClient(payload);
            addToast(editing ? 'Brand updated.' : `${payload.name} added.`, 'success');
            onClose();
        } catch (err) {
            console.error('Save brand error:', err);
            setError("Couldn't save the brand. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={() => { if (!saving) onClose(); }}
            size="md"
            title={editing ? `Edit ${editing.name || 'brand'}` : 'Add a brand partner'}
            subtitle="Logos loop on the creator page and the home page."
            footer={(
                <div className="space-y-2">
                    {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={saving} className="h-12">Cancel</Button>
                        <Button variant="primary" type="submit" form="brand-form" disabled={saving || uploading} className="h-12 flex-1">
                            {saving && <Loader2 size={15} className="animate-spin" />}
                            {saving ? 'Saving…' : uploading ? 'Uploading logo…' : editing ? 'Save changes' : 'Add brand'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <form id="brand-form" onSubmit={submit} noValidate className="space-y-4">
                <Field label="Brand name">
                    <input className={fieldCls} value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Red Bull" autoComplete="off" />
                </Field>
                <ImageSlot
                    label="Logo"
                    hint="PNG or SVG with a transparent background looks best"
                    aspect="aspect-[3/1]"
                    contain
                    previewUrl={form.logoUrl}
                    url={form.logoUrl}
                    onFile={pickLogo}
                    onUrl={set('logoUrl')}
                    onClear={() => set('logoUrl')('')}
                />
                {uploading && <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500"><Loader2 size={12} className="animate-spin" /> Uploading…</p>}
                <Field label="Website" optional hint="Only shown here in the admin">
                    <input className={fieldCls} type="url" inputMode="url" autoCapitalize="off" value={form.websiteUrl} onChange={(e) => set('websiteUrl')(e.target.value)} placeholder="brand.com" />
                </Field>
                <div>
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">How it looks in the marquee</span>
                    <div className="flex items-center justify-center rounded-2xl bg-gray-950 p-5">
                        <div className="flex h-14 w-40 items-center justify-center">
                            {form.logoUrl
                                ? <img src={form.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                                : <span className="text-[16px] font-extrabold text-white/80">{form.name || 'Brand'}</span>}
                        </div>
                    </div>
                </div>
            </form>
        </Sheet>
    );
};

const BrandPartnersManager = () => {
    useStoreSubscription(['pastClients', 'siteSettings']);
    const clients = useStore(s => s.pastClients) || [];
    const siteSettings = useStore(s => s.siteSettings);
    const addToast = useStore(s => s.addToast);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);
    const [togglingVisibility, setTogglingVisibility] = useState(false);

    const visible = siteSettings?.showPastClients !== false;

    const openEditor = (c = null) => { setEditing(c); setEditorOpen(true); };

    const setVisible = async (next) => {
        if (togglingVisibility) return;
        setTogglingVisibility(true);
        try {
            await useStore.getState().updateGeneralSettings({ showPastClients: next });
            addToast(next ? 'Brand logos are showing.' : 'Brand logos are hidden.', 'success');
        } catch {
            addToast('Check your connection and try again.', 'error', { title: next ? "Couldn't show the brand logos" : "Couldn't hide the brand logos", action: { label: 'Try again', onClick: () => setVisible(next) } });
        } finally {
            setTogglingVisibility(false);
        }
    };

    const move = async (index, delta) => {
        if (busy) return;
        setBusy(true);
        try {
            await moveItem(clients, index, delta, useStore.getState().updatePastClient);
        } catch {
            addToast('Check your connection and try again.', 'error', { title: "Couldn't change the order", action: { label: 'Try again', onClick: () => move(index, delta) } });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        try {
            await useStore.getState().deletePastClient(deleting.id);
            addToast(`${deleting.name || 'Brand'} removed.`, 'success');
            setDeleting(null);
        } catch {
            addToast('Check your connection and try again.', 'error', { title: "Couldn't remove the brand", action: { label: 'Try again', onClick: () => remove() } });
        }
    };

    return (
        <section className="space-y-4" onSubmit={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('green').chip)}><Building2 size={18} /></span>
                    <div className="min-w-0">
                        <h2 className="text-[17px] font-extrabold">Brand partners</h2>
                        <p className="text-[13px] text-gray-500">{clients.length} {clients.length === 1 ? 'brand' : 'brands'} · they scroll in this order</p>
                    </div>
                </div>
                <Button variant="accent" onClick={() => openEditor()} className="h-11"><Plus size={15} /> Add brand</Button>
            </div>

            <div className={cn('rounded-2xl border p-3', visible ? 'border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]' : 'border-amber-500/30 bg-amber-500/[0.06]')}>
                <Toggle
                    label="Show the brand logo marquee"
                    hint={visible ? 'On the creator page and the home page.' : 'Hidden on the creator page and the home page.'}
                    checked={visible}
                    onChange={setVisible}
                />
            </div>

            {clients.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <EmptyState
                        icon={Building2}
                        tone="green"
                        title="No brands added yet"
                        description="Until you add one, the marquee shows the default list (Spotify, Red Bull, Levi's and others). Adding brands replaces it."
                        action={<Button variant="accent" onClick={() => openEditor()}><Plus size={15} /> Add brand</Button>}
                    />
                </div>
            ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {clients.map((client, i) => (
                        <li key={client.id} className="flex flex-col rounded-2xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
                            <div className="relative">
                                <LogoTile client={client} className="h-20" />
                                <span className={cn('absolute left-1.5 top-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums', accent('green').chip)}>{i + 1}</span>
                                {!client.logoUrl && <span className="absolute bottom-1.5 right-1.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">No logo</span>}
                            </div>
                            <div className="mt-2 flex items-start gap-1">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-bold">{client.name || 'Unnamed'}</p>
                                    {client.websiteUrl ? (
                                        <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-[12px] font-semibold text-sky-600 hover:underline dark:text-sky-300">
                                            <span className="truncate">{client.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}</span><ExternalLink size={10} className="shrink-0" />
                                        </a>
                                    ) : <p className="text-[12px] text-gray-400">No website</p>}
                                </div>
                                <Menu trigger={({ toggle }) => (
                                    <Button size="sm" variant="ghost" onClick={toggle} aria-label={`Actions for ${client.name || 'brand'}`} className="h-10 w-10 shrink-0 px-0"><MoreHorizontal size={16} /></Button>
                                )}>
                                    <MenuItem icon={Pencil} onClick={() => openEditor(client)}>Edit</MenuItem>
                                    <MenuItem icon={ArrowUp} onClick={() => move(i, -1)} disabled={i === 0 || busy}>Move earlier</MenuItem>
                                    <MenuItem icon={ArrowDown} onClick={() => move(i, 1)} disabled={i === clients.length - 1 || busy}>Move later</MenuItem>
                                    <MenuItem icon={Trash2} danger onClick={() => setDeleting(client)}>Remove</MenuItem>
                                </Menu>
                            </div>
                            <div className="mt-2 flex items-center gap-1 border-t border-black/[0.06] pt-2 dark:border-white/[0.06]">
                                <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label="Move earlier" className="h-10 w-10 px-0"><ArrowLeft size={15} /></Button>
                                <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === clients.length - 1 || busy} aria-label="Move later" className="h-10 w-10 px-0"><ArrowRight size={15} /></Button>
                                <span className="flex-1" />
                                <Button size="sm" variant="secondary" onClick={() => openEditor(client)} className="h-10"><Pencil size={13} /> Edit</Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {!visible && clients.length > 0 && (
                <p className="flex items-center gap-1.5 text-[12px] text-gray-500"><EyeOff size={13} /> These are saved but not showing anywhere while the marquee is off.</p>
            )}

            <BrandEditor open={editorOpen} editing={editing} onClose={() => setEditorOpen(false)} />
            <ConfirmSheet
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                title={`Remove ${deleting?.name || 'this brand'}?`}
                confirmLabel="Remove"
                onConfirm={remove}
            >
                <p>The logo comes off the creator page and the home page. You can add it again later.</p>
            </ConfirmSheet>
        </section>
    );
};

export default BrandPartnersManager;
