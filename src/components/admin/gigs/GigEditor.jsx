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
import CityInput, { cleanCity } from '../CityInput';
import { isNativeForm, formState } from '../forms/formSchema';
import { syncGigFormDays } from '../../../lib/gigApplications';
import { ensureGigForm } from './gigForm';
import { cleanAmbient } from '../../../lib/ambientColor';
import { AmbientColorField, ColorDots, EditorBar, PhoneBar, dayKeyOf, formatDay, todayKey, useConfirm, useImageField, useUnsavedWarning } from '../forms/kit';
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
    city: '',
    description: '',
    status: 'Open',
    formId: '',
    whatsappLink: '',
    slots: '',
    image: '',
    highlightColor: '#39FF14',
    ambientColor: '',
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
        formId: gig.formId || '',
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

    // Forms a gig can take applications through: its own, or a shared one (not another gig's).
    const nativeForms = useMemo(() => (forms || []).filter(f => isNativeForm(f) && (!f.gigId || f.gigId === gig?.id)), [forms, gig?.id]);
    const linkedForm = nativeForms.find(f => f.id === data.formId);
    const ownForm = Boolean(linkedForm && linkedForm.gigId && linkedForm.gigId === gig?.id);
    // Older gigs sent people to an outside link or WhatsApp; saving moves them into the app.
    const legacyApply = editing && !gig.formId && (gig.applyType === 'whatsapp' || /^https?:\/\//i.test(gig.applyLink || ''));

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
        if (data.whatsappLink && !/^https:\/\/\S+/i.test(String(data.whatsappLink).trim())) p.crew = 'The crew group link should start with https://';
        if (data.slots !== '' && (!Number.isInteger(Number(data.slots)) || Number(data.slots) < 1)) p.slots = 'Spots must be a whole number above 0.';
        return p;
    }, [data]);

    const previewData = useMemo(() => ({ ...data, applyType: 'form', applyLink: `/community?gig=${gig?.id || ''}` }), [data, gig?.id]);

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
            city: cleanCity(data.city),
            description: data.description || '',
            status: data.status || 'Open',
            // Applications always happen in the app; an empty formId gets the standard crew form below.
            applyType: 'form',
            applyLink: data.formId ? `/forms/${data.formId}` : '',
            formId: data.formId || '',
            whatsappLink: String(data.whatsappLink || '').trim(),
            slots: data.slots === '' ? null : Number(data.slots),
            image: data.image || '',
            highlightColor: data.highlightColor || '#39FF14',
            ambientColor: cleanAmbient(data.ambientColor),
            isPinned: Boolean(data.isPinned),
            imageTransform: data.imageTransform,
            updatedAt: new Date().toISOString(),
        };
        // Older gigs kept a single `date`; keep it in step so nothing that reads it breaks.
        if (gig?.date !== undefined) payload.date = payload.dates[0] || '';

        setSaving(true);
        try {
            const store = useStore.getState();
            let gigId = gig?.id;
            if (editing) {
                await store.updateVolunteerGig(gig.id, payload);
                if (payload.formId && payload.status !== (gig.status || 'Open')) {
                    await syncGigForm(payload.formId, payload.status, forms).catch(err => console.warn('Form status sync failed:', err));
                }
                // The gig's own form keeps its title and its "which days" question in step.
                if (ownForm) {
                    const patch = {};
                    const days = syncGigFormDays(linkedForm.fields, payload);
                    if (days) patch.fields = days;
                    if (payload.title !== gig.title) patch.title = `${payload.title} · crew application`;
                    if (Object.keys(patch).length) await store.updateForm(linkedForm.id, { ...patch, updatedAt: payload.updatedAt }).catch(err => console.warn('Gig form sync failed:', err));
                }
            } else {
                const ref = await store.addVolunteerGig(payload);
                gigId = ref?.id;
                if (homeCard && ref?.id) {
                    await store.addUpcomingEvent({
                        title: payload.title,
                        description: payload.description,
                        image: payload.image,
                        ambientColor: payload.ambientColor,
                        location: payload.location || 'GLOBAL',
                        date: payload.dates[0] || new Date().toISOString(),
                        buttonText: 'JOIN SQUAD',
                        link: `/community?gig=${ref.id}`,
                        highlightColor: payload.highlightColor,
                        category: 'volunteer',
                        relatedVolunteerGigId: ref.id,
                        gigId: ref.id,
                        isVolunteerGig: true,
                    }).catch(err => { console.warn(err); addToast("We couldn't add it to the home page.", 'warning', { title: 'Gig saved' }); });
                }
                if (notify && ref?.id) {
                    notifyAllUsers('New volunteer opportunity', `${payload.title} is looking for volunteers. Apply in the app.`, `/community?gig=${ref.id}`, payload.image || '')
                        .catch(err => console.warn('Gig notification failed:', err));
                }
            }
            let imported = 0;
            if (!payload.formId && gigId) {
                try {
                    imported = (await ensureGigForm(gigId)).imported || 0;
                } catch (err) {
                    console.error(err);
                    addToast('Open the gig again and press Save to retry.', 'warning', { title: "Gig saved, but applications aren't set up" });
                }
            }
            if (imported) addToast(`${imported} ${imported === 1 ? 'person' : 'people'} who tapped “I’m interested” are now in Applicants.`, 'info');
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
                                    <input className={cn(fieldCls, err('location') && 'border-red-500/60')} value={data.location || ''} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Jayamahal Palace" />
                                </Field>
                            </div>
                            <Field label="City" optional hint="Shown on the card; Community filters by it">
                                <CityInput className={fieldCls} value={data.city} onChange={(v) => set({ city: v })} />
                            </Field>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Applications" hint="People apply in the Newbi app. You review and confirm them under Applicants.">
                        <div className="space-y-3">
                            {legacyApply && (
                                <p className="rounded-xl bg-amber-500/10 px-3.5 py-3 text-[13px] font-semibold text-amber-800 dark:text-amber-200">
                                    This gig still sends people to {gig.applyType === 'whatsapp' ? 'WhatsApp' : 'an outside link'}. Saving moves applications into the app, and anyone who tapped “I’m interested” shows up under Applicants.
                                </p>
                            )}
                            <Field label="Application questions" hint={linkedForm && formState(linkedForm) === 'closed' && (data.status || 'Open') !== 'Closed' ? 'This form is closed, so no one can apply. Reopen it in Forms.' : null}>
                                <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={data.formId || ''} onChange={(e) => set({ formId: e.target.value })}>
                                    {/* Once the gig has its own form, that form is the standard one (its applicants live there). */}
                                    {!nativeForms.some(f => f.gigId && f.gigId === gig?.id) && <option value="">Standard crew application (recommended)</option>}
                                    {nativeForms.map(f => <option key={f.id} value={f.id}>{f.gigId === gig?.id ? 'This gig’s application' : (f.title || 'Untitled form')}{formState(f) === 'closed' ? ' (closed)' : ''}</option>)}
                                </ThemedSelect>
                            </Field>
                            <p className="text-[12px] text-gray-500">
                                {data.formId
                                    ? `${(linkedForm?.fields || []).filter(f => f.type !== 'heading').length} questions. People sign in once and apply inside the gig; one application each.`
                                    : 'Name, WhatsApp number, email, city and college, Instagram, which days they can do, past experience and a note. Made for this gig when you save.'}
                            </p>
                            {data.formId && (
                                <a href={`/admin/forms/edit/${data.formId}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 text-[13px] font-semibold text-orange-600 dark:text-orange-300">
                                    Edit the questions in a new tab <ExternalLink size={13} />
                                </a>
                            )}
                            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                                <Field label="Spots" optional hint="Crew size you need">
                                    <input className={cn(fieldCls, err('slots') && 'border-red-500/60')} type="number" min="1" inputMode="numeric" value={data.slots ?? ''} onChange={(e) => set({ slots: e.target.value })} placeholder="No limit" />
                                </Field>
                                <Field label="Crew group link" optional hint="Shown only to confirmed volunteers, inside the app">
                                    <input className={cn(fieldCls, err('crew') && 'border-red-500/60')} inputMode="url" autoCapitalize="off" value={data.whatsappLink || ''} onChange={(e) => set({ whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/…" />
                                </Field>
                            </div>
                            {err('crew') && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{err('crew')}</p>}
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
                                <AmbientColorField image={data.image} value={data.ambientColor} onChange={(v) => set({ ambientColor: v })} />
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
