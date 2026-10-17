import React, { useEffect, useRef, useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { Field, Section, fieldCls, areaCls } from '../uploads/UploadKit';
import { ImageSlot } from '../events/EditorParts';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import WhereItShows from './WhereItShows';

/*
 * Create or edit a ticket sale straight from Ticket sales, without making an
 * event in Events first. It is saved as a ticketed event (the same document
 * shape the Events editor writes, `createdIn: 'ticketing'`), so orders,
 * payments, coupons, check-in and the app's Tickets tab work unchanged.
 * Payment details are set in the sale's Settings tab after creating it.
 */

const splitDate = (value) => {
    const raw = String(value || '');
    return { date: raw.slice(0, 10), time: /T\d{2}:\d{2}/.test(raw) ? raw.slice(11, 16) : '' };
};

const newTier = () => ({ id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: '', price: '', capacity: '' });

const EMPTY = {
    title: '', date: '', time: '', location: '', city: '', description: '', image: '',
    tiers: [{ ...newTier(), name: 'General admission' }],
    showOnSite: true, showInApp: true,
};

const fromEvent = (e) => {
    const { date, time } = splitDate(e.date);
    const cats = Array.isArray(e.ticketCategories) ? e.ticketCategories : [];
    return {
        title: e.title || '',
        date,
        time: e.time || time,
        location: e.location || e.venue || '',
        city: e.city || '',
        description: e.description || '',
        image: e.image || '',
        tiers: cats.length
            ? cats.map(c => ({ id: c.id, name: c.name || '', price: c.price ?? '', capacity: c.capacity ?? '' }))
            : [{ ...newTier(), name: 'General admission', price: e.basePrice ?? '', capacity: e.ticketCapacity ?? '' }],
        // Events made before these switches existed show everywhere.
        showOnSite: e.showOnSite !== false,
        showInApp: e.showInApp !== false,
    };
};

const TicketSaleEditor = ({ open, onClose, event, onSaved }) => {
    const addToast = useStore(s => s.addToast);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [problem, setProblem] = useState('');
    const savingRef = useRef(false);
    const editing = Boolean(event?.id);

    useEffect(() => {
        if (!open) return;
        setForm(event ? fromEvent(event) : { ...EMPTY, tiers: [{ ...newTier(), name: 'General admission' }] });
        setProblem('');
    }, [open, event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (patch) => setForm(f => ({ ...f, ...patch }));
    const setTier = (i, patch) => setForm(f => ({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));

    const upload = async (file) => {
        if (!file?.type?.startsWith('image/')) { addToast('Choose an image file.', 'error'); return; }
        setUploading(true);
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            if (!url) throw new Error('No URL');
            set({ image: url });
        } catch (err) {
            console.error(err);
            addToast("Couldn't upload the image. Please try again.", 'error');
        } finally {
            setUploading(false);
        }
    };
    const onPaste = (e) => {
        const item = Array.from(e.clipboardData?.items || []).find(i => i.kind === 'file' && i.type.startsWith('image/'));
        if (!item) return;
        e.preventDefault();
        upload(item.getAsFile());
    };

    const save = async (e) => {
        e?.preventDefault();
        if (savingRef.current) return;
        setProblem('');
        if (!form.title.trim()) return setProblem('Give the show a name.');
        if (!form.date) return setProblem('Add the date.');
        if (!form.location.trim()) return setProblem('Add the venue.');
        const tiers = form.tiers.filter(t => String(t.name).trim() || String(t.price).trim());
        if (!tiers.length) return setProblem('Add at least one ticket type.');
        if (tiers.some(t => !String(t.name).trim())) return setProblem('Every ticket type needs a name.');
        if (tiers.some(t => Number(t.price) < 0 || Number.isNaN(Number(t.price || 0)))) return setProblem('Prices must be 0 or more.');

        const ticketCategories = tiers.map(t => ({
            id: t.id,
            name: String(t.name).trim(),
            price: Math.max(0, Number(t.price) || 0),
            capacity: t.capacity === '' || t.capacity === null ? null : Math.max(0, parseInt(t.capacity, 10) || 0),
        }));
        const data = {
            title: form.title.trim(),
            date: form.time ? `${form.date}T${form.time}` : form.date,
            time: form.time || '',
            location: form.location.trim(),
            city: form.city.trim(),
            description: form.description.trim(),
            image: form.image.trim(),
            isTicketed: true,
            ticketMode: 'qr',
            ticketCategories,
            basePrice: Math.min(...ticketCategories.map(t => t.price)),
            showOnSite: form.showOnSite,
            showInApp: form.showInApp,
        };

        savingRef.current = true;
        setSaving(true);
        try {
            let id = event?.id;
            if (editing) {
                await useStore.getState().updateUpcomingEvent(id, data);
            } else {
                id = await useStore.getState().addUpcomingEvent({
                    ...data,
                    createdIn: 'ticketing',
                    isGuestlistEnabled: false,
                    buttonText: 'Get tickets',
                    createdAt: new Date().toISOString(),
                }, false);
            }
            addToast(editing ? 'Ticket sale saved.' : 'Ticket sale created. Add payment details in Settings.', 'success');
            onSaved?.(id, { created: !editing });
            onClose();
        } catch (err) {
            console.error(err);
            setProblem("Couldn't save the ticket sale. Please check your connection and try again.");
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            size="xl"
            title={editing ? 'Edit ticket sale' : 'New ticket sale'}
            subtitle="Sell tickets for a show. No event in Events needed."
            bodyClassName="space-y-7"
            footer={(
                <div className="space-y-2">
                    {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
                    <div className="flex gap-2">
                        <Button variant="secondary" className="h-12" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button variant="accent" type="submit" form="ticket-sale-editor" className="h-12 flex-1" disabled={saving || uploading}>
                            {saving ? 'Saving…' : uploading ? 'Uploading image…' : editing ? 'Save changes' : 'Create ticket sale'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <form id="ticket-sale-editor" onSubmit={save} className="space-y-7" noValidate>
                <Section title="The show">
                    <Field label="Name">
                        <input className={fieldCls} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Arijit Singh · Bengaluru" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date">
                            <input className={fieldCls} type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                        </Field>
                        <Field label="Time" optional>
                            <input className={fieldCls} type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} />
                        </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Venue">
                            <input className={fieldCls} value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Phoenix Arena" />
                        </Field>
                        <Field label="City" optional>
                            <input className={fieldCls} value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="Bengaluru" />
                        </Field>
                    </div>
                    <Field label="About" optional hint="Line-up, age limit, entry rules">
                        <textarea className={cn(areaCls, 'min-h-[100px]')} value={form.description} onChange={(e) => set({ description: e.target.value })} />
                    </Field>
                </Section>

                <Section title="Tickets" hint="One row per ticket type. Leave “How many” blank for no limit.">
                    <div className="space-y-2">
                        {form.tiers.map((t, i) => (
                            <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_96px_96px_44px] items-end gap-2">
                                <Field label={i === 0 ? 'Ticket type' : undefined}>
                                    <input className={fieldCls} value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="Early bird" />
                                </Field>
                                <Field label={i === 0 ? 'Price (₹)' : undefined}>
                                    <input className={fieldCls} type="number" inputMode="decimal" min="0" value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} placeholder="0" />
                                </Field>
                                <Field label={i === 0 ? 'How many' : undefined}>
                                    <input className={fieldCls} type="number" inputMode="numeric" min="0" value={t.capacity ?? ''} onChange={(e) => setTier(i, { capacity: e.target.value })} placeholder="No limit" />
                                </Field>
                                <button
                                    type="button"
                                    aria-label="Remove ticket type"
                                    disabled={form.tiers.length === 1}
                                    onClick={() => set({ tiers: form.tiers.filter((_, j) => j !== i) })}
                                    className="flex h-12 w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <Button variant="ghost" className="h-10" onClick={() => set({ tiers: [...form.tiers, newTier()] })}><Plus size={15} /> Add a ticket type</Button>
                    </div>
                </Section>

                <Section title="Poster">
                    <div className="max-w-xs">
                        <ImageSlot
                            label={uploading ? 'Poster · uploading…' : 'Poster'}
                            hint="Paste works too"
                            previewUrl={form.image}
                            url={form.image}
                            onFile={upload}
                            onUrl={(v) => set({ image: v })}
                            onClear={() => set({ image: '' })}
                            onPaste={onPaste}
                        />
                    </div>
                </Section>

                <WhereItShows value={form} onChange={set} kind="ticket" />
            </form>
        </Sheet>
    );
};

export default TicketSaleEditor;
