import React, { useMemo, useState } from 'react';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { useStore } from '../../../lib/store';
import { notifyAllUsers } from '../../../lib/notificationTriggers';
import { cn } from '../../../lib/utils';
import LivePreview from '../LivePreview';
import { Button } from '../ui';
import { BuilderCard, ImageSlot } from '../events/EditorParts';
import { Field, Toggle, Choice, fieldCls, areaCls } from '../uploads/UploadKit';
import { isNativeForm, formState } from '../forms/formSchema';
import { ColorDots, EditorBar, PhoneBar, dayKeyOf, formatDay, todayKey, useConfirm, useImageField, useUnsavedWarning } from '../forms/kit';
import ThemedSelect from '../ThemedSelect';

export const GIG_STATUS = [
    { value: 'Open', label: 'Open', hint: 'Taking applications' },
    { value: 'Filling Fast', label: 'Filling fast', hint: 'Shows urgency' },
    { value: 'Closed', label: 'Closed', hint: 'No new applications' },
];

const EMPTY = {
    title: '',
    dates: [],
    time: '',
    location: '',
    description: '',
    status: 'Open',
    applyType: 'link',
    applyLink: '',
    formId: '',
    whatsappLink: '',
    slots: '',
    image: '',
    highlightColor: '#39FF14',
    isPinned: false,
    imageTransform: { scale: 1.05, x: 0, y: 0 },
};

const FORM_LABEL_FOR = { Open: 'Live', 'Filling Fast': 'Few Slots Remain', Closed: 'Closed' };

/**
 * A gig that takes applications through a Newbi form keeps the form's status
 * in step, so closing the gig really stops new applications.
 */
export const syncGigForm = async (formId, gigStatus, forms) => {
    const form = (forms || []).find(f => f.id === formId);
    const label = FORM_LABEL_FOR[gigStatus];
    if (!form || !label || form.activeLabel === label) return false;
    await useStore.getState().updateForm(formId, { activeLabel: label });
    return true;
};

/** The gig's dates as clean "YYYY-MM-DD" strings (old gigs used `date` or timestamps). */
export const gigDates = (gig) => {
    const raw = Array.isArray(gig?.dates) && gig.dates.length ? gig.dates : gig?.date ? [gig.date] : [];
    return [...new Set(raw.map(dayKeyOf).filter(Boolean))].sort();
};

const GigEditor = ({ gig, forms, onDone }) => {
    const addToast = useStore(s => s.addToast);
    const upcomingEvents = useStore(s => s.upcomingEvents) || [];
    const editing = Boolean(gig?.id);
    const [data, setData] = useState(() => (gig ? {
        ...EMPTY,
        ...gig,
        dates: gigDates(gig),
        applyType: gig.formId ? 'form' : (gig.applyType || 'link'),
        applyLink: gig.formId ? '' : (gig.applyLink || ''),
        slots: gig.slots || '',
        imageTransform: gig.imageTransform || EMPTY.imageTransform,
    } : EMPTY));
    const [newDate, setNewDate] = useState('');
    const [notify, setNotify] = useState(true);
    const [homeCard, setHomeCard] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [tried, setTried] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [confirm, confirmEl] = useConfirm();
    useUnsavedWarning(dirty);

    const set = (patch) => { setData(prev => ({ ...prev, ...patch })); setDirty(true); };
    const image = useImageField(data.image, (url) => set({ image: url }));

    const nativeForms = useMemo(() => (forms || []).filter(isNativeForm), [forms]);
    const linkedForm = nativeForms.find(f => f.id === data.formId);

    const addDate = (value = newDate) => {
        if (!value) return;
        if (data.dates.includes(value)) { setNewDate(''); return; }
        set({ dates: [...data.dates, value].sort() });
        setNewDate('');
    };

    const problems = useMemo(() => {
        const p = {};
        if (!data.title.trim()) p.title = 'Give the gig a title.';
        if (!String(data.location || '').trim()) p.location = 'Add where it happens.';
        if (data.applyType === 'form' && !data.formId) p.apply = 'Pick the form people fill to apply.';
        if (data.applyType === 'link' && data.applyLink && !/^https?:\/\/\S+/i.test(data.applyLink.trim())) p.apply = 'The link should start with https://';
        if (data.applyType === 'whatsapp' && String(data.applyLink).replace(/\D/g, '').length < 10) p.apply = 'Add the WhatsApp number with country code, e.g. 919876543210.';
        if (data.slots !== '' && (!Number.isInteger(Number(data.slots)) || Number(data.slots) < 1)) p.slots = 'Spots must be a whole number above 0.';
        return p;
    }, [data]);

    const previewData = useMemo(() => ({
        ...data,
        applyLink: data.applyType === 'form' && data.formId ? `/forms/${data.formId}` : data.applyLink,
    }), [data]);

    const save = async (e) => {
        e?.preventDefault();
        if (saving) return;
        setTried(true);
        const first = Object.values(problems)[0];
        if (first) { addToast(first, 'warning'); return; }
        const pastOnly = data.dates.length && data.dates.every(d => d < todayKey());
        if (pastOnly && !(await confirm({
            title: 'All dates are in the past',
            body: 'Gigs whose dates have passed are moved to Past events automatically. Save anyway?',
            confirmLabel: 'Save anyway',
            tone: 'accent',
        }))) return;

        const payload = {
            title: data.title.trim(),
            dates: data.dates,
            time: data.time || '',
            location: data.location.trim(),
            description: data.description || '',
            status: data.status || 'Open',
            applyType: data.applyType,
            applyLink: data.applyType === 'form' ? `/forms/${data.formId}` : String(data.applyLink || '').trim(),
            formId: data.applyType === 'form' ? data.formId : '',
            whatsappLink: String(data.whatsappLink || '').trim(),
            slots: data.slots === '' ? null : Number(data.slots),
            image: data.image || '',
            highlightColor: data.highlightColor || '#39FF14',
            isPinned: Boolean(data.isPinned),
            imageTransform: data.imageTransform,
            updatedAt: new Date().toISOString(),
        };
        // Older gigs kept a single `date`; keep it in step so nothing that reads it breaks.
        if (gig?.date !== undefined) payload.date = payload.dates[0] || '';

        setSaving(true);
        try {
            const store = useStore.getState();
            if (editing) {
                await store.updateVolunteerGig(gig.id, payload);
                if (payload.formId && payload.status !== (gig.status || 'Open')) {
                    await syncGigForm(payload.formId, payload.status, forms).catch(err => console.warn('Form status sync failed:', err));
                }
            } else {
                const ref = await store.addVolunteerGig(payload);
                if (homeCard && ref?.id) {
                    await store.addUpcomingEvent({
                        title: payload.title,
                        description: payload.description,
                        image: payload.image,
                        location: payload.location || 'GLOBAL',
                        date: payload.dates[0] || new Date().toISOString(),
                        buttonText: 'JOIN SQUAD',
                        link: payload.applyType !== 'whatsapp' && payload.applyLink ? payload.applyLink : '/community',
                        highlightColor: payload.highlightColor,
                        category: 'volunteer',
                        relatedVolunteerGigId: ref.id,
                        gigId: ref.id,
                        isVolunteerGig: true,
                    }).catch(err => { console.warn(err); addToast("We couldn't add it to the home page.", 'warning', { title: 'Gig saved' }); });
                }
                if (notify) {
                    notifyAllUsers('New volunteer opportunity', `${payload.title} is looking for volunteers. Apply now in the community tab.`, '/community', payload.image || '')
                        .catch(err => console.warn('Gig notification failed:', err));
                }
            }
            setDirty(false);
            addToast(editing ? 'Gig saved.' : 'Gig published.', 'success');
            onDone(true);
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', {
                title: 'Gig not saved',
                action: { label: 'Try again', onClick: () => save() },
            });
        } finally {
            setSaving(false);
        }
    };

    const leave = async () => {
        if (dirty && !(await confirm({ title: 'Leave without saving?', body: 'Your changes to this gig will be lost.', confirmLabel: 'Leave', cancelLabel: 'Keep editing' }))) return;
        setDirty(false);
        onDone(false);
    };

    const err = (key) => (tried ? problems[key] : null);
    const saveLabel = saving ? 'Saving…' : editing ? 'Save changes' : 'Publish gig';
    const alreadyOnHome = editing && upcomingEvents.some(e => e.gigId === gig.id || e.relatedVolunteerGigId === gig.id);

    return (
        <div className="pb-28 sm:pb-10">
            <EditorBar backLabel="Gigs" onBack={leave} title={data.title || (editing ? 'Edit gig' : 'New gig')}>
                <Button variant="secondary" onClick={() => setShowPreview(v => !v)} className="h-10 xl:hidden">
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />} {showPreview ? 'Edit' : 'Preview'}
                </Button>
                <Button variant="primary" type="submit" form="gig-editor" disabled={saving || image.uploading} className="hidden h-10 sm:inline-flex">{saveLabel}</Button>
            </EditorBar>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form id="gig-editor" onSubmit={save} noValidate className={cn('space-y-5', showPreview && 'hidden xl:block')}>
                    <BuilderCard title="Basics" hint="What the crew will do">
                        <div className="space-y-3">
                            <Field label="Title">
                                <input className={cn(fieldCls, err('title') && 'border-red-500/60')} value={data.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Event crew for Sunburn Arena" />
                            </Field>
                            <Field label="Description" optional>
                                <textarea className={areaCls} rows={4} value={data.description || ''} onChange={(e) => set({ description: e.target.value })} placeholder="The role, what volunteers get (passes, merch, certificates), timings, dress code" />
                            </Field>
                            <div>
                                <p className="mb-1.5 text-[12px] font-bold text-gray-500">Status</p>
                                <Choice value={data.status || 'Open'} onChange={(v) => set({ status: v })} options={GIG_STATUS} />
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="When and where">
                        <div className="space-y-3">
                            <div>
                                <p className="mb-1.5 text-[12px] font-bold text-gray-500">Dates <span className="font-medium">(one or more)</span></p>
                                {data.dates.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {data.dates.map(d => (
                                            <span key={d} className={cn('inline-flex h-10 items-center gap-1 rounded-xl pl-3 pr-1 text-[13px] font-semibold', d < todayKey() ? 'bg-black/5 text-gray-500 dark:bg-white/5' : 'bg-orange-500/10 text-orange-700 dark:text-orange-300')}>
                                                {formatDay(d)}
                                                <button type="button" onClick={() => set({ dates: data.dates.filter(x => x !== d) })} aria-label={`Remove ${formatDay(d)}`} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X size={14} /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input className={fieldCls} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDate(); } }} />
                                    <Button variant="secondary" onClick={() => addDate()} disabled={!newDate} className="h-12 shrink-0"><Plus size={15} /> Add</Button>
                                </div>
                                {!data.dates.length && <p className="mt-1 text-[11px] text-gray-500">No dates yet. The card shows “TBA”.</p>}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                                <Field label="Reporting time" optional>
                                    <input className={fieldCls} type="time" value={data.time || ''} onChange={(e) => set({ time: e.target.value })} />
                                </Field>
                                <Field label="Location">
                                    <input className={cn(fieldCls, err('location') && 'border-red-500/60')} value={data.location || ''} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Jayamahal Palace, Bengaluru" />
                                </Field>
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="How people apply" hint="Use a Newbi form to see and manage applicants here">
                        <div className="space-y-3">
                            <Choice
                                value={data.applyType}
                                onChange={(v) => set({ applyType: v })}
                                options={[
                                    { value: 'form', label: 'Newbi form', hint: 'Applicants listed here' },
                                    { value: 'link', label: 'Link', hint: 'Google Form or site' },
                                    { value: 'whatsapp', label: 'WhatsApp', hint: 'Message a number' },
                                ]}
                            />
                            {data.applyType === 'form' && (
                                <Field label="Application form" hint={linkedForm ? `${formState(linkedForm) === 'closed' ? 'This form is closed, so no one can apply. ' : ''}People open /forms/${linkedForm.id}` : null}>
                                    <ThemedSelect className={cn(fieldCls, 'cursor-pointer', err('apply') && 'border-red-500/60')} value={data.formId || ''} onChange={(e) => set({ formId: e.target.value })}>
                                        <option value="">Choose a form…</option>
                                        {nativeForms.map(f => <option key={f.id} value={f.id}>{f.title || 'Untitled form'}{formState(f) === 'closed' ? ' (closed)' : ''}</option>)}
                                    </ThemedSelect>
                                </Field>
                            )}
                            {data.applyType === 'form' && (
                                <a href="/admin/forms/create" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 text-[13px] font-semibold text-orange-600 dark:text-orange-300">
                                    {nativeForms.length ? 'Make a new form' : 'No built-in forms yet. Make one'} in a new tab <ExternalLink size={13} />
                                </a>
                            )}
                            {data.applyType === 'link' && (
                                <Field label="Apply link" optional hint="Without a link the card opens the community page">
                                    <input className={cn(fieldCls, err('apply') && 'border-red-500/60')} inputMode="url" autoCapitalize="off" value={data.applyLink || ''} onChange={(e) => set({ applyLink: e.target.value })} placeholder="https://forms.gle/…" />
                                </Field>
                            )}
                            {data.applyType === 'whatsapp' && (
                                <Field label="WhatsApp number" hint="With country code, no spaces">
                                    <input className={cn(fieldCls, err('apply') && 'border-red-500/60')} inputMode="tel" value={data.applyLink || ''} onChange={(e) => set({ applyLink: e.target.value })} placeholder="919876543210" />
                                </Field>
                            )}
                            {err('apply') && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{err('apply')}</p>}
                            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                                <Field label="Spots" optional hint="Crew size you need">
                                    <input className={cn(fieldCls, err('slots') && 'border-red-500/60')} type="number" min="1" inputMode="numeric" value={data.slots ?? ''} onChange={(e) => set({ slots: e.target.value })} placeholder="No limit" />
                                </Field>
                                <Field label="Crew group link" optional hint="WhatsApp group for confirmed volunteers">
                                    <input className={fieldCls} inputMode="url" autoCapitalize="off" value={data.whatsappLink || ''} onChange={(e) => set({ whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/…" />
                                </Field>
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Look" hint="Card image and colour on the community page">
                        <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
                            <ImageSlot label={image.uploading ? 'Uploading…' : 'Image'} hint="Paste works too" aspect="aspect-[4/3]" {...image.slotProps} transform={data.imageTransform} onTransform={(t) => set({ imageTransform: t })} />
                            <div className="space-y-4">
                                <div>
                                    <p className="mb-2 text-[12px] font-bold text-gray-500">Highlight colour</p>
                                    <ColorDots value={data.highlightColor} onChange={(v) => set({ highlightColor: v })} />
                                </div>
                                <Toggle label="Spotlight" hint="Pinned to the featured row on the community page" checked={Boolean(data.isPinned)} onChange={(v) => set({ isPinned: v })} />
                            </div>
                        </div>
                    </BuilderCard>

                    {!editing ? (
                        <BuilderCard title="When you publish">
                            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                                <div className="pb-3"><Toggle label="Notify everyone" hint="An in-app and push notification about the new gig" checked={notify} onChange={setNotify} /></div>
                                <div className="pt-3"><Toggle label="Show on the home page" hint="Adds a card to Upcoming events" checked={homeCard} onChange={setHomeCard} /></div>
                            </div>
                        </BuilderCard>
                    ) : alreadyOnHome ? (
                        <p className="px-1 text-[12px] text-gray-500">This gig has a home page card; it updates when you save.</p>
                    ) : null}
                </form>

                <aside className={cn('mx-auto w-full max-w-sm space-y-3 xl:sticky xl:top-24 xl:max-w-none xl:self-start', !showPreview && 'hidden xl:block')}>
                    <p className="text-[12px] font-bold text-gray-500">Live preview</p>
                    <LivePreview type="gig" data={previewData} />
                </aside>
            </div>

            <PhoneBar>
                <Button variant="ghost" onClick={leave} className="h-12">Cancel</Button>
                <Button variant="primary" type="submit" form="gig-editor" disabled={saving || image.uploading} className="h-12 flex-1">{saveLabel}</Button>
            </PhoneBar>
            {confirmEl}
        </div>
    );
};

export default GigEditor;
