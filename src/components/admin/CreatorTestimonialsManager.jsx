import React, { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { PREDEFINED_CITIES, CREATOR_NICHES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import Star from 'lucide-react/dist/esm/icons/star';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import MessageSquareQuote from 'lucide-react/dist/esm/icons/message-square-quote';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Sheet from './Sheet';
import { accent } from './theme';
import { Button, Badge, Avatar, EmptyState, Menu, MenuItem } from './ui';
import { Field, Toggle, fieldCls, areaCls } from './uploads/UploadKit';
import { ImageSlot } from './events/EditorParts';
import ConfirmSheet from './creators/ConfirmSheet';
import { uploadImage, moveItem } from './creators/uploadImage';
import ThemedSelect from './ThemedSelect';

/*
 * Creator testimonials for the public /creator page: add, edit, reorder,
 * show/hide and delete. Also rendered inside Site content (which wraps it in
 * a form), so every handler stops its submit from reaching that form.
 */

const QUOTE_MAX = 400;
const EMPTY_FORM = { name: '', city: 'Bengaluru', niche: '', handle: '', quote: '', avatarUrl: '', rating: 5, isActive: true };
const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

const Stars = ({ value, onChange, size = 15 }) => (
    <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => {
            const on = n <= value;
            const icon = <Star size={size} className={on ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-zinc-600'} />;
            return onChange ? (
                <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                    {icon}
                </button>
            ) : <span key={n}>{icon}</span>;
        })}
    </span>
);

const TestimonialPreview = ({ t }) => (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <Stars value={Number(t.rating) || 5} size={13} />
        <p className="mt-2 line-clamp-5 text-[14px] leading-relaxed text-gray-700 dark:text-zinc-300">“{t.quote || 'Their words will appear here.'}”</p>
        <div className="mt-3 flex items-center gap-2.5">
            <Avatar src={t.avatarUrl} name={t.name || '?'} size={36} className="rounded-full" />
            <div className="min-w-0">
                <p className="truncate text-[13px] font-bold">{t.name || 'Creator name'}</p>
                <p className="truncate text-[12px] text-gray-500">{[t.city, t.niche, t.handle && (/^\d|[kKmM]$/.test(t.handle) ? t.handle : `@${t.handle.replace(/^@/, '')}`)].filter(Boolean).join(' · ')}</p>
            </div>
        </div>
    </div>
);

const TestimonialEditor = ({ open, editing, onClose }) => {
    const addToast = useStore(s => s.addToast);
    const [form, setForm] = useState(EMPTY_FORM);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setForm(editing ? {
            name: editing.name || '',
            city: editing.city || 'Bengaluru',
            niche: editing.niche || '',
            handle: editing.handle || '',
            quote: editing.quote || '',
            avatarUrl: editing.avatarUrl || '',
            rating: Number(editing.rating) || 5,
            isActive: editing.isActive !== false,
        } : EMPTY_FORM);
    }, [open, editing]);

    const set = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));
    const cities = PREDEFINED_CITIES.filter(c => c !== 'Others');
    const cityIsCustom = form.city && !cities.includes(form.city);

    const pickPhoto = async (file) => {
        setError('');
        setUploading(true);
        try {
            const url = await uploadImage(file);
            set('avatarUrl')(url);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const submit = async (e) => {
        stop(e);
        if (saving || uploading) return;
        if (!form.name.trim()) return setError("Add the creator's name.");
        if (!form.quote.trim()) return setError('Add what they said.');
        if (form.quote.length > QUOTE_MAX) return setError(`Keep the quote under ${QUOTE_MAX} characters.`);
        setError('');
        const payload = {
            name: form.name.trim(),
            city: form.city.trim() || 'Pan-India',
            niche: form.niche.trim() || 'Creator',
            handle: form.handle.trim().replace(/^@/, ''),
            quote: form.quote.trim(),
            avatarUrl: form.avatarUrl.trim(),
            rating: Math.min(5, Math.max(1, Number(form.rating) || 5)),
            isActive: form.isActive,
        };
        setSaving(true);
        try {
            if (editing) await useStore.getState().updateCreatorTestimonial(editing.id, payload);
            else await useStore.getState().addCreatorTestimonial(payload);
            addToast(editing ? 'Testimonial updated.' : 'Testimonial added.', 'success');
            onClose();
        } catch (err) {
            console.error('Save testimonial error:', err);
            setError("Couldn't save the testimonial. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={() => { if (!saving) onClose(); }}
            size="lg"
            title={editing ? 'Edit testimonial' : 'Add a testimonial'}
            subtitle="Real words from a real creator. They show on the creator page."
            footer={(
                <div className="space-y-2">
                    {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={saving} className="h-12">Cancel</Button>
                        <Button variant="primary" type="submit" form="testimonial-form" disabled={saving || uploading} className="h-12 flex-1">
                            {saving && <Loader2 size={15} className="animate-spin" />}
                            {saving ? 'Saving…' : uploading ? 'Uploading photo…' : editing ? 'Save changes' : 'Add testimonial'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <form id="testimonial-form" onSubmit={submit} noValidate className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
                <div className="space-y-3">
                    <ImageSlot
                        label="Photo"
                        hint="Square works best"
                        aspect="aspect-square"
                        previewUrl={form.avatarUrl}
                        url={form.avatarUrl}
                        onFile={pickPhoto}
                        onUrl={set('avatarUrl')}
                        onClear={() => set('avatarUrl')('')}
                    />
                    {uploading && <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500"><Loader2 size={12} className="animate-spin" /> Uploading…</p>}
                </div>
                <div className="space-y-4">
                    <Field label="Creator's name">
                        <input className={fieldCls} value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Priya Sharma" autoComplete="off" />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="City">
                            <ThemedSelect className={fieldCls} value={cityIsCustom || form.city === '' ? '__custom' : form.city} onChange={(e) => set('city')(e.target.value === '__custom' ? (cityIsCustom ? form.city : '') : e.target.value)}>
                                {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="__custom">Other city…</option>
                            </ThemedSelect>
                        </Field>
                        <Field label="Niche" optional>
                            <input className={fieldCls} list="testimonial-niches" value={form.niche} onChange={(e) => set('niche')(e.target.value)} placeholder="Fashion & Luxury" />
                            <datalist id="testimonial-niches">{CREATOR_NICHES.map(n => <option key={n} value={n} />)}</datalist>
                        </Field>
                    </div>
                    {(cityIsCustom || form.city === '') && (
                        <Field label="City name">
                            <input className={fieldCls} value={form.city} onChange={(e) => set('city')(e.target.value)} placeholder="Mysuru" />
                        </Field>
                    )}
                    <Field label="Instagram handle or audience" optional hint="@priyastyle, or something like 45K">
                        <input className={fieldCls} value={form.handle} onChange={(e) => set('handle')(e.target.value)} autoCapitalize="off" />
                    </Field>
                    <Field label="What they said" hint={`${form.quote.length}/${QUOTE_MAX}`}>
                        <textarea rows={4} className={cn(areaCls, 'resize-y', form.quote.length > QUOTE_MAX && 'border-red-500/60')} value={form.quote} onChange={(e) => set('quote')(e.target.value)} placeholder="How working with Newbi went for them" />
                    </Field>
                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Rating</span>
                        <Stars value={form.rating} onChange={set('rating')} size={20} />
                    </div>
                    <div className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                        <Toggle label="Show on the creator page" hint="Turn off to keep it saved but hidden" checked={form.isActive} onChange={set('isActive')} />
                    </div>
                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Preview</span>
                        <TestimonialPreview t={form} />
                    </div>
                </div>
            </form>
        </Sheet>
    );
};

const CreatorTestimonialsManager = () => {
    useStoreSubscription(['creatorTestimonials', 'siteSettings']);
    const testimonials = useStore(s => s.creatorTestimonials) || [];
    const siteSettings = useStore(s => s.siteSettings);
    const addToast = useStore(s => s.addToast);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const sectionVisible = siteSettings?.showCreatorTestimonials !== false;
    const visibleCount = testimonials.filter(t => t.isActive !== false).length;

    const openEditor = (t = null) => { setEditing(t); setEditorOpen(true); };

    const toggleActive = async (t) => {
        if (busy) return;
        setBusy(true);
        try {
            await useStore.getState().updateCreatorTestimonial(t.id, { isActive: t.isActive === false });
            addToast(t.isActive === false ? 'Testimonial is visible.' : 'Testimonial hidden.', 'success');
        } catch {
            addToast("Couldn't update the testimonial. Please try again.", 'error');
        } finally {
            setBusy(false);
        }
    };

    const move = async (index, delta) => {
        if (busy) return;
        setBusy(true);
        try {
            await moveItem(testimonials, index, delta, useStore.getState().updateCreatorTestimonial);
        } catch {
            addToast("Couldn't change the order. Please try again.", 'error');
        } finally {
            setBusy(false);
        }
    };

    const showSection = async () => {
        try {
            await useStore.getState().updateGeneralSettings({ showCreatorTestimonials: true });
            addToast('Testimonials are showing on the creator page.', 'success');
        } catch {
            addToast("Couldn't change that. Please try again.", 'error');
        }
    };

    const remove = async () => {
        try {
            await useStore.getState().deleteCreatorTestimonial(deleting.id);
            addToast('Testimonial deleted.', 'success');
            setDeleting(null);
        } catch {
            addToast("Couldn't delete the testimonial. Please try again.", 'error');
        }
    };

    return (
        <section className="space-y-4" onSubmit={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('rose').chip)}><MessageSquareQuote size={18} /></span>
                    <div className="min-w-0">
                        <h2 className="text-[17px] font-extrabold">Creator testimonials</h2>
                        <p className="text-[13px] text-gray-500">{visibleCount} showing · {testimonials.length - visibleCount} hidden · the order here is the order on the page</p>
                    </div>
                </div>
                <Button variant="accent" onClick={() => openEditor()} className="h-11"><Plus size={15} /> Add testimonial</Button>
            </div>

            {!sectionVisible && (
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center">
                    <EyeOff size={17} className="shrink-0 text-amber-600 dark:text-amber-300" />
                    <p className="min-w-0 flex-1 text-[13px] font-semibold">The testimonials section is turned off, so none of these show on the creator page.</p>
                    <Button variant="secondary" onClick={showSection}>Turn it on</Button>
                </div>
            )}

            {testimonials.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <EmptyState
                        icon={MessageSquareQuote}
                        tone="rose"
                        title="No testimonials yet"
                        description="The creator page skips this section until you add one. Ask a creator you've worked with for a line or two."
                        action={<Button variant="accent" onClick={() => openEditor()}><Plus size={15} /> Add testimonial</Button>}
                    />
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {testimonials.map((t, i) => {
                        const hidden = t.isActive === false;
                        return (
                            <li key={t.id} className={cn('flex flex-col rounded-2xl border bg-white p-4 dark:bg-white/[0.03]', hidden ? 'border-dashed border-black/15 dark:border-white/15' : 'border-black/[0.06] dark:border-white/[0.08]')}>
                                <div className="flex items-start gap-3">
                                    <span className={cn('flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 text-[12px] font-bold tabular-nums', accent('rose').chip)}>{i + 1}</span>
                                    <Avatar src={t.avatarUrl} name={t.name} size={44} className="rounded-full" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[15px] font-bold">{t.name || 'Unnamed'}</p>
                                        <p className="truncate text-[12px] text-gray-500">{[t.city, t.niche].filter(Boolean).join(' · ')}</p>
                                    </div>
                                    <Menu trigger={({ toggle }) => (
                                        <Button size="sm" variant="ghost" onClick={toggle} aria-label="Testimonial actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
                                    )}>
                                        <MenuItem icon={Pencil} onClick={() => openEditor(t)}>Edit</MenuItem>
                                        <MenuItem icon={hidden ? Eye : EyeOff} onClick={() => toggleActive(t)}>{hidden ? 'Show on the page' : 'Hide from the page'}</MenuItem>
                                        <MenuItem icon={ArrowUp} onClick={() => move(i, -1)} disabled={i === 0 || busy}>Move up</MenuItem>
                                        <MenuItem icon={ArrowDown} onClick={() => move(i, 1)} disabled={i === testimonials.length - 1 || busy}>Move down</MenuItem>
                                        <MenuItem icon={Trash2} danger onClick={() => setDeleting(t)}>Delete</MenuItem>
                                    </Menu>
                                </div>
                                <div className="mt-2 pl-10"><Stars value={Number(t.rating) || 5} size={13} /></div>
                                <p className="mt-2 line-clamp-4 text-[14px] leading-relaxed text-gray-700 dark:text-zinc-300">“{t.quote}”</p>
                                <div className="flex-1" />
                                <div className="mt-3 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                    {hidden ? <Badge tone="gray"><EyeOff size={11} /> Hidden</Badge> : <Badge tone="green"><Eye size={11} /> Showing</Badge>}
                                    {t.handle && <span className="truncate text-[12px] text-gray-500">{/^\d|[kKmM]$/.test(t.handle) ? t.handle : `@${t.handle}`}</span>}
                                    <span className="flex-1" />
                                    <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label="Move up" className="h-10 w-10 px-0"><ArrowUp size={15} /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === testimonials.length - 1 || busy} aria-label="Move down" className="h-10 w-10 px-0"><ArrowDown size={15} /></Button>
                                    <Button size="sm" variant="secondary" onClick={() => openEditor(t)} className="h-10"><Pencil size={13} /> Edit</Button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <TestimonialEditor open={editorOpen} editing={editing} onClose={() => setEditorOpen(false)} />
            <ConfirmSheet
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                title="Delete this testimonial?"
                confirmLabel="Delete"
                onConfirm={remove}
            >
                <p>{deleting?.name ? `${deleting.name}'s` : 'This'} testimonial will be removed from the creator page for good. To keep it but not show it, hide it instead.</p>
            </ConfirmSheet>
        </section>
    );
};

export default CreatorTestimonialsManager;
