import React, { useEffect, useRef, useState } from 'react';
import Eye from 'lucide-react/dist/esm/icons/eye';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { Field, Section, Toggle, Choice, fieldCls, areaCls } from '../uploads/UploadKit';
import { ImageSlot } from './EditorParts';
import GuestlistTaskConfig from '../GuestlistTaskConfig';
import LivePreview from '../LivePreview';
import { useStore } from '../../../lib/store';
import { notifyAllUsers } from '../../../lib/notificationTriggers';
import { cn } from '../../../lib/utils';
import WhereItShows from '../ticketing/WhereItShows';

/*
 * Create or edit a standalone guestlist (one that isn't part of an event made
 * in Events). Same fields and document shape as the old Guestlists editor.
 */

const COLORS = [
    { name: 'Blue', value: '#2ebfff' },
    { name: 'Green', value: '#39FF14' },
    { name: 'Pink', value: '#FF4F8B' },
    { name: 'Purple', value: '#BF00FF' },
];

const EMPTY = {
    title: '', date: '', location: '', description: '', status: 'Open',
    maxSpots: 100, currentSpots: 0, perUserLimit: 2,
    image: '', highlightColor: '#2ebfff', isPinned: false, imageTransform: { scale: 1.05, x: 0, y: 0 },
    guestlistEnabled: true, guestlistMode: 'qr', hasGuestlistTask: false, guestlistTask: null, externalLink: '',
    showOnSite: true, showInApp: true,
};

const fromDoc = (gl) => ({
    title: gl.title || '',
    date: String(gl.date || '').slice(0, 10),
    location: gl.location || '',
    description: gl.description || '',
    status: gl.status || 'Open',
    maxSpots: gl.maxSpots ?? 100,
    currentSpots: gl.currentSpots || 0,
    perUserLimit: gl.perUserLimit || 2,
    image: gl.image || '',
    highlightColor: gl.highlightColor || '#2ebfff',
    isPinned: !!gl.isPinned,
    imageTransform: gl.imageTransform || { scale: 1.05, x: 0, y: 0 },
    guestlistEnabled: gl.guestlistEnabled !== undefined ? gl.guestlistEnabled : true,
    guestlistMode: gl.guestlistMode || 'qr',
    hasGuestlistTask: !!gl.hasGuestlistTask,
    guestlistTask: gl.guestlistTask || null,
    externalLink: gl.externalLink || '',
    // Lists made before these switches existed only showed in the app's Community tab.
    showOnSite: gl.showOnSite === true,
    showInApp: gl.showInApp === true,
});

const GuestlistEditor = ({ open, onClose, guestlist, onSaved }) => {
    const addToast = useStore(s => s.addToast);
    const [form, setForm] = useState(EMPTY);
    const [notify, setNotify] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [problem, setProblem] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const savingRef = useRef(false);
    const editing = Boolean(guestlist?.id);

    useEffect(() => {
        if (!open) return;
        setForm(guestlist ? fromDoc(guestlist) : EMPTY);
        setNotify(false);
        setProblem('');
        setShowPreview(false);
    }, [open, guestlist?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (patch) => setForm(f => ({ ...f, ...patch }));

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
        if (!form.title.trim()) return setProblem('Give the guestlist a name.');
        if (!form.location.trim()) return setProblem('Add where it happens.');
        if (form.guestlistEnabled) {
            const max = Number(form.maxSpots);
            const per = Number(form.perUserLimit);
            if (!(max > 0)) return setProblem('Capacity must be at least 1.');
            if (!(per > 0)) return setProblem('Spots per person must be at least 1.');
            if (per > max) return setProblem('Spots per person can’t be more than the capacity.');
        } else if (!/^https?:\/\/\S+$/i.test(form.externalLink.trim())) {
            return setProblem('Add the sign-up link (starting with https://).');
        }

        savingRef.current = true;
        setSaving(true);
        try {
            const data = {
                ...form,
                title: form.title.trim(),
                location: form.location.trim(),
                externalLink: form.externalLink.trim(),
                maxSpots: Math.floor(Number(form.maxSpots)) || 0,
                perUserLimit: Math.floor(Number(form.perUserLimit)) || 1,
                isGuestlistEnabled: true, // read by Ticketing and the scanner
            };
            // The live counter is owned by sign-ups; never overwrite it from a stale form.
            delete data.currentSpots;
            let id = guestlist?.id;
            if (editing) {
                await useStore.getState().updateGuestlist(id, data);
            } else {
                id = await useStore.getState().addGuestlist({ ...data, currentSpots: 0 });
                if (notify) {
                    try {
                        await notifyAllUsers(
                            `Guestlist open: ${data.title}`,
                            `Grab your spot for ${data.title} at ${data.location}. Spots are limited.`,
                            '/guestlists',
                            data.image
                        );
                    } catch (err) {
                        console.error(err);
                        addToast("Guestlist created, but the notification didn't go out.", 'error');
                    }
                }
            }
            addToast(editing ? 'Guestlist saved.' : 'Guestlist created.', 'success');
            onSaved?.(id);
            onClose();
        } catch (err) {
            console.error(err);
            setProblem("Couldn't save the guestlist. Please check your connection and try again.");
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
            title={editing ? 'Edit guestlist' : 'New guestlist'}
            subtitle="Sign-ups for a show. No event in Events needed."
            bodyClassName="space-y-7"
            footer={(
                <div className="space-y-2">
                    {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
                    <div className="flex gap-2">
                        <Button variant="secondary" className="h-12" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button variant="accent" type="submit" form="guestlist-editor" className="h-12 flex-1" disabled={saving || uploading}>
                            {saving ? 'Saving…' : uploading ? 'Uploading image…' : editing ? 'Save changes' : 'Create guestlist'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <form id="guestlist-editor" onSubmit={save} className="space-y-7" noValidate>
                <Section title="The guestlist">
                    <Field label="Name">
                        <input className={fieldCls} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Skyline soirée" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Date" optional>
                            <input className={fieldCls} type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                        </Field>
                        <Field label="Where">
                            <input className={fieldCls} value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Rooftop lounge, Bandra" />
                        </Field>
                    </div>
                    <Field label="Description" optional hint="Entry rules, age limit, dress code">
                        <textarea className={cn(areaCls, 'min-h-[110px]')} value={form.description} onChange={(e) => set({ description: e.target.value })} />
                    </Field>
                    <Field label="Status">
                        <Choice value={form.status} onChange={(v) => set({ status: v })} options={[
                            { value: 'Open', label: 'Open', hint: 'Taking sign-ups' },
                            { value: 'Filling Fast', label: 'Filling fast', hint: 'Shows urgency' },
                            { value: 'Closed', label: 'Closed', hint: 'No new sign-ups' },
                        ]} />
                    </Field>
                </Section>

                <Section title="Sign-ups">
                    <Toggle
                        label="Take sign-ups on Newbi"
                        hint={form.guestlistEnabled ? 'People join here and get a pass' : 'People are sent to another site'}
                        checked={form.guestlistEnabled}
                        onChange={(v) => set({ guestlistEnabled: v })}
                    />
                    {form.guestlistEnabled ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Capacity" hint={editing ? `${guestlist?.currentSpots || 0} spots taken now` : 'Total people'}>
                                    <input className={fieldCls} type="number" inputMode="numeric" min="1" value={form.maxSpots} onChange={(e) => set({ maxSpots: e.target.value })} />
                                </Field>
                                <Field label="Spots per person" hint="Including themselves">
                                    <input className={fieldCls} type="number" inputMode="numeric" min="1" value={form.perUserLimit} onChange={(e) => set({ perUserLimit: e.target.value })} />
                                </Field>
                            </div>
                            <Field label="Entry">
                                <Choice value={form.guestlistMode || 'qr'} onChange={(v) => set({ guestlistMode: v })} options={[
                                    { value: 'qr', label: 'QR passes', hint: 'Scanned at the door' },
                                    { value: 'rsvp', label: 'RSVP only', hint: 'Name on a list, no QR' },
                                ]} />
                            </Field>
                            <GuestlistTaskConfig
                                enabled={form.hasGuestlistTask}
                                taskData={form.guestlistTask}
                                onChange={({ hasGuestlistTask, guestlistTask }) => set({ hasGuestlistTask, guestlistTask })}
                                accentColor="neon-pink"
                            />
                        </>
                    ) : (
                        <Field label="Sign-up link">
                            <input className={fieldCls} type="url" inputMode="url" autoCapitalize="off" value={form.externalLink} onChange={(e) => set({ externalLink: e.target.value })} placeholder="https://tally.so/r/…" />
                        </Field>
                    )}
                </Section>

                <Section title="Poster and look">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <ImageSlot
                            label={uploading ? 'Cover image · uploading…' : 'Cover image'}
                            hint="Paste works too"
                            aspect="aspect-[16/10]"
                            previewUrl={form.image}
                            url={form.image}
                            onFile={upload}
                            onUrl={(v) => set({ image: v })}
                            onClear={() => set({ image: '' })}
                            onPaste={onPaste}
                            transform={form.imageTransform}
                            onTransform={(t) => set({ imageTransform: t })}
                        />
                        <div className="space-y-4">
                            <div>
                                <span className="mb-1 block text-[12px] font-bold text-gray-500">Highlight colour</span>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => set({ highlightColor: c.value })}
                                            aria-pressed={form.highlightColor === c.value}
                                            className={cn('flex h-11 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold',
                                                form.highlightColor === c.value ? 'border-black/40 dark:border-white/50' : 'border-black/10 dark:border-white/10')}
                                        >
                                            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.value }} />
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Toggle label="Feature at the top" hint="Shows in the spotlight row on the guestlists page" checked={form.isPinned} onChange={(v) => set({ isPinned: v })} />
                        </div>
                    </div>
                </Section>

                <WhereItShows value={form} onChange={set} kind="guestlist" />

                {!editing && (
                    <Section title="When you create it">
                        <Toggle label="Notify everyone" hint="Push notification and email to all users" checked={notify} onChange={setNotify} />
                    </Section>
                )}

                <div>
                    <button type="button" onClick={() => setShowPreview(v => !v)} className="flex h-10 items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                        <Eye size={14} /> {showPreview ? 'Hide preview' : 'Show card preview'}
                        <ChevronDown size={14} className={cn('transition-transform', showPreview && 'rotate-180')} />
                    </button>
                    {showPreview && (
                        <div className="mx-auto mt-3 max-w-sm">
                            <LivePreview type="gl" data={form} hideDecorations />
                        </div>
                    )}
                </div>
            </form>
        </Sheet>
    );
};

export default GuestlistEditor;
