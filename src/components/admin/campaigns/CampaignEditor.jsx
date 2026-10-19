import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Layers from 'lucide-react/dist/esm/icons/layers';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { useStoreSubscription } from '../../../hooks/useStoreSubscription';
import { PREDEFINED_CITIES, CREATOR_NICHES, nicheKey } from '../../../lib/constants';
import { accent } from '../theme';
import { Button, EmptyState, Card } from '../ui';
import { Field, fieldCls, Toggle, Choice } from '../uploads/UploadKit';
import { BuilderCard, ImageSlot } from '../events/EditorParts';
import RichEditor from '../RichEditor';
import LivePreview from '../LivePreview';
import TaskCard from './TaskCard';
import { ConfirmSheet, Spinner } from './parts';
import OpenFormCard, { OPEN_FORM_FIELDS, openFormFromCampaign, openFormPayload, validateOpenForm } from './outreach/OpenFormCard';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { TASK_TYPES, blankTask, newTaskId, campaignStatus, stripHtml, formatDay, toDayInput, daysUntil, inr } from './campaignModel';
import ThemedSelect from '../ThemedSelect';

/*
 * Create / edit a campaign. Sections follow the order an admin thinks in:
 * what it is, what creators must do, who can apply, what they get, when,
 * how it looks, and who can see it. Save from the top bar (desktop) or the
 * bottom bar (phone).
 */

const SECTIONS = [
    { id: 'cm-basics', label: 'Basics' },
    { id: 'cm-brief', label: 'Brief' },
    { id: 'cm-deliverables', label: 'Deliverables' },
    { id: 'cm-eligibility', label: 'Who can apply' },
    { id: 'cm-pay', label: 'Pay and spots' },
    { id: 'cm-tickets', label: 'Event passes' },
    { id: 'cm-dates', label: 'Deadlines' },
    { id: 'cm-open-form', label: 'Open form' },
    { id: 'cm-images', label: 'Images' },
    { id: 'cm-visibility', label: 'Visibility' },
];

const toStr = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? '' : String(v));

const blankForm = (uid) => ({
    title: '', brand: '', brandLogo: '', description: '', whatsappLink: '',
    targetCity: 'Any', targetCollege: '', minInstagramFollowers: '', preferredNiches: [],
    reward: '', payoutPerCreator: '', totalSpots: '', spotsLeft: '',
    thumbnail: '', websiteApplyEnabled: true, autoShortlistEligible: false, isPinned: false,
    applyMethod: 'newbi', applyFormUrl: '', applyFormNeedsSignIn: false,
    eventId: '', ticketsPerCreator: '', ticketAutoIssue: '', passKind: 'qr',
    eventName: '', eventDate: '', eventTime: '', venue: '',
    status: 'Open', tasks: [], createdBy: uid || '',
    ...OPEN_FORM_FIELDS,
});

/** A stored campaign → editable form values (strings for number inputs). */
const toForm = (c, { copy = false } = {}) => ({
    ...blankForm(c.createdBy),
    title: copy ? `Copy of ${c.title || 'campaign'}` : (c.title || ''),
    brand: c.brand || '',
    brandLogo: c.brandLogo || '',
    description: c.description || '',
    whatsappLink: c.whatsappLink || '',
    targetCity: c.targetCity || 'Any',
    targetCollege: c.targetCollege && c.targetCollege !== 'Any' ? c.targetCollege : '',
    minInstagramFollowers: Number(c.minInstagramFollowers) ? String(Number(c.minInstagramFollowers)) : '',
    preferredNiches: Array.isArray(c.preferredNiches) ? c.preferredNiches : [],
    reward: c.reward || '',
    payoutPerCreator: toStr(c.payoutPerCreator),
    totalSpots: toStr(c.totalSpots),
    spotsLeft: copy ? '' : toStr(c.spotsLeft),
    thumbnail: c.thumbnail || '',
    eventId: c.eventId || '',
    ticketsPerCreator: toStr(c.ticketsPerCreator),
    ticketAutoIssue: ['selected', 'completed'].includes(c.ticketAutoIssue) ? c.ticketAutoIssue : '',
    passKind: c.passKind === 'confirmation' ? 'confirmation' : 'qr',
    eventName: c.eventName || '',
    eventDate: toDayInput(c.eventDate) || '',
    eventTime: c.eventTime || '',
    venue: c.venue || '',
    websiteApplyEnabled: c.websiteApplyEnabled !== false,
    applyMethod: ['newbi', 'form', 'both'].includes(c.applyMethod) ? c.applyMethod : 'newbi',
    applyFormUrl: c.applyFormUrl || '',
    applyFormNeedsSignIn: Boolean(c.applyFormNeedsSignIn),
    // Stored truthiness: an old campaign without the flag never auto-selected.
    autoShortlistEligible: Boolean(c.autoShortlistEligible),
    isPinned: copy ? false : Boolean(c.isPinned),
    status: copy ? 'Draft' : ({ open: 'Open', draft: 'Draft', live: 'Live' }[campaignStatus(c)] || c.status || 'Closed'),
    ...openFormFromCampaign(c, { copy }),
    tasks: (c.tasks || []).map((t, i) => ({
        ...t,
        ...(copy ? { id: newTaskId(), submissions: {}, completedBy: [], verifiedBy: [] } : {}),
        title: t.title || '',
        taskType: t.taskType || 'custom',
        platform: t.platform || 'instagram',
        priority: t.priority || 'required',
        deadline: t.deadline || '',
        taskLinks: t.taskLinks || [],
        creativeAssets: t.creativeAssets || [],
        order: t.order ?? i,
    })),
});

const num = (v) => (v === '' || v === null || v === undefined ? null : Math.max(0, Number(v) || 0));

/** Form values → what gets saved. Only fields this editor owns. */
const toPayload = (f) => ({
    title: f.title.trim(),
    brand: f.brand.trim(),
    brandLogo: f.brandLogo.trim(),
    description: f.description || '',
    whatsappLink: f.whatsappLink.trim(),
    targetCity: f.targetCity.trim() || 'Any',
    targetCollege: f.targetCollege.trim() || 'Any',
    minInstagramFollowers: num(f.minInstagramFollowers) || 0,
    preferredNiches: f.preferredNiches,
    reward: f.reward.trim(),
    payoutPerCreator: num(f.payoutPerCreator),
    totalSpots: num(f.totalSpots),
    spotsLeft: num(f.spotsLeft),
    thumbnail: f.thumbnail.trim(),
    // Event passes for selected creators: a linked event (optional; without one the pass uses the
    // name, date and venue below), QR pass or confirmation without a QR, how many each, and when they go out.
    eventId: f.eventId || null,
    ticketsPerCreator: num(f.ticketsPerCreator) || 1,
    ticketAutoIssue: f.ticketAutoIssue || null,
    passKind: f.passKind === 'confirmation' ? 'confirmation' : 'qr',
    eventName: f.eventId ? '' : f.eventName.trim(),
    eventDate: f.eventId ? '' : f.eventDate || '',
    eventTime: f.eventId ? '' : f.eventTime.trim(),
    venue: f.eventId ? '' : f.venue.trim(),
    websiteApplyEnabled: f.websiteApplyEnabled,
    // How creators apply: one tap with their Newbi ID, a Google Form, or either.
    applyMethod: f.applyFormUrl.trim() ? f.applyMethod : 'newbi',
    applyFormUrl: f.applyFormUrl.trim(),
    applyFormNeedsSignIn: Boolean(f.applyFormUrl.trim() && f.applyFormNeedsSignIn),
    autoShortlistEligible: false, // retired: applying never shortlists
    isPinned: f.isPinned,
    status: f.status,
    // The open application form (outreach): public fields only; the group link and template are private.
    ...openFormPayload(f),
    tasks: f.tasks.map((t, i) => ({
        ...t,
        title: (t.title || '').trim() || `Deliverable ${i + 1}`,
        order: i,
        taskLinks: (t.taskLinks || []).filter(l => String(l.url || '').trim()),
    })),
});

const firstImageFrom = (e) => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return null;
    for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile();
    }
    return null;
};

const CampaignEditor = ({ campaign, source, isEdit, loaded, creators, onSave, onCancel, onCopyTaskLink }) => {
    useStoreSubscription(['upcomingEvents']);
    const user = useStore(s => s.user);
    const addToast = useStore(s => s.addToast);
    const upcomingEvents = useStore(s => s.upcomingEvents);
    const [form, setForm] = useState(() => blankForm(user?.uid));
    const [readyFor, setReadyFor] = useState(isEdit ? null : 'new');
    const baseline = useRef(JSON.stringify(blankForm(user?.uid)));
    const [openTask, setOpenTask] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState({});
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [announce, setAnnounce] = useState(true);
    const [removeTask, setRemoveTask] = useState(null);
    const [leaving, setLeaving] = useState(false);
    const [otherCity, setOtherCity] = useState(false);
    // Upcoming events to link (plus the one already linked, even if it has passed).
    const eventOptions = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return (upcomingEvents || [])
            .filter(e => e.id === form.eventId || !e.date || new Date(e.date) >= today)
            .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
            .map(e => ({ id: e.id, label: [e.title || 'Untitled event', e.date ? formatDay(e.date) : null].filter(Boolean).join(' · ') }));
    }, [upcomingEvents, form.eventId]);

    // Load the campaign once per id (and a duplicate source once). Later
    // listener updates (a creator submitting) must not wipe the admin's edits.
    useEffect(() => {
        if (isEdit) {
            if (!campaign || readyFor === campaign.id) return;
            const next = toForm(campaign);
            setForm(next);
            baseline.current = JSON.stringify(next);
            setReadyFor(campaign.id);
            setOtherCity(Boolean(next.targetCity) && next.targetCity !== 'Any' && !PREDEFINED_CITIES.includes(next.targetCity));
            setAnnounce(!campaign.announcedAt);
        } else if (source && readyFor !== `copy:${source.id}`) {
            const next = { ...toForm(source, { copy: true }), createdBy: user?.uid || '' };
            setForm(next);
            baseline.current = JSON.stringify(blankForm(user?.uid));
            setReadyFor(`copy:${source.id}`);
            setOtherCity(Boolean(next.targetCity) && next.targetCity !== 'Any' && !PREDEFINED_CITIES.includes(next.targetCity));
        }
    }, [isEdit, campaign, source, readyFor, user?.uid]);

    const dirty = JSON.stringify(form) !== baseline.current;

    // Warn before closing the tab with unsaved changes.
    useEffect(() => {
        if (!dirty || saving) return undefined;
        const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBefore);
        return () => window.removeEventListener('beforeunload', onBefore);
    }, [dirty, saving]);

    const set = (patch) => setForm(prev => ({ ...prev, ...patch }));
    const setTask = (index, patch) => setForm(prev => ({ ...prev, tasks: prev.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));

    const upload = async (key, file, apply) => {
        if (!file) return;
        if (!file.type?.startsWith('image/')) { addToast('Please choose an image file.', 'error'); return; }
        setUploading(u => ({ ...u, [key]: true }));
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            if (!url) throw new Error('No URL');
            apply(url);
        } catch {
            addToast("Couldn't upload the image. Please try again.", 'error');
        } finally {
            setUploading(u => ({ ...u, [key]: false }));
        }
    };

    const addTask = (kind) => {
        const t = blankTask(kind, form.tasks);
        setForm(prev => ({ ...prev, tasks: [...prev.tasks, t] }));
        setOpenTask(t.id);
    };
    const moveTask = (index, dir) => setForm(prev => {
        const tasks = [...prev.tasks];
        const j = index + dir;
        if (j < 0 || j >= tasks.length) return prev;
        [tasks[index], tasks[j]] = [tasks[j], tasks[index]];
        return { ...prev, tasks };
    });
    const duplicateTask = (index) => {
        const src = form.tasks[index];
        if (!src) return;
        const copy = { ...src, id: newTaskId(), title: `${src.title || 'Deliverable'} (copy)`, submissions: {}, completedBy: [], verifiedBy: [] };
        setForm(prev => {
            const tasks = [...prev.tasks];
            tasks.splice(index + 1, 0, copy);
            return { ...prev, tasks };
        });
        setOpenTask(copy.id);
    };
    const submissionsCount = (t) => Object.values(campaign?.tasks?.find(x => String(x.id) === String(t.id))?.submissions || {}).filter(s => s?.status).length;
    const askRemoveTask = (index) => {
        const t = form.tasks[index];
        if (submissionsCount(t) > 0 || stripHtml(t.description) || t.googleFormLink || t.ticketLink) setRemoveTask(index);
        else setForm(prev => ({ ...prev, tasks: prev.tasks.filter((_, i) => i !== index) }));
    };

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Give the campaign a title.';
        if (!stripHtml(form.description) && !/<img/i.test(form.description)) e.description = 'Write a short brief so creators know what this is.';
        if (!form.reward.trim()) e.reward = 'Say what creators get (money, products, entry…).';
        const total = num(form.totalSpots);
        const left = num(form.spotsLeft);
        if (total !== null && left !== null && left > total) e.spotsLeft = "Spots left can't be more than total spots.";
        if (form.applyMethod !== 'newbi') {
            if (!form.applyFormUrl.trim()) e.applyFormUrl = 'Paste the Google Form link.';
            else if (!/^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/i.test(form.applyFormUrl.trim())) e.applyFormUrl = 'Use a Google Form link (docs.google.com/forms/… or forms.gle/…).';
        }
        Object.assign(e, validateOpenForm(form, { targetCity: form.targetCity }));
        return e;
    };

    const originalStatus = isEdit && campaign ? campaignStatus(campaign) : null;
    const goingLive = form.status === 'Open' && originalStatus !== 'open';

    const save = async (statusOverride) => {
        if (saving) return;
        if (isEdit && readyFor !== campaign?.id) return;
        const next = statusOverride ? { ...form, status: statusOverride } : form;
        const e = validate();
        // A draft can be saved half-finished; only a title is needed.
        const blocking = next.status === 'Draft' ? (e.title ? { title: e.title } : {}) : e;
        setErrors(blocking);
        if (Object.keys(blocking).length) {
            const firstKey = Object.keys(blocking)[0];
            document.getElementById(`cm-field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            addToast('A few things need fixing before saving.', 'error');
            return;
        }
        setSaving(true);
        try {
            // Two campaigns can't share an open-form link.
            const slug = String(next.slug || '').trim().toLowerCase();
            if (slug && db) {
                const taken = await getDocs(query(collection(db, 'campaigns'), where('slug', '==', slug)));
                if (taken.docs.some(d => d.id !== campaign?.id)) {
                    setErrors({ slug: 'Another campaign already uses this link name.' });
                    document.getElementById('cm-field-slug')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    addToast('Pick another link name for the open form.', 'error');
                    return;
                }
            }
            const payload = toPayload(next);
            if (!isEdit) payload.createdBy = next.createdBy || user?.uid || '';
            const willGoLive = payload.status === 'Open' && originalStatus !== 'open';
            await onSave(payload, { notify: willGoLive ? announce : undefined });
            baseline.current = JSON.stringify(next);
        } catch (err) {
            console.error('Failed to save campaign:', err);
            addToast(err?.message?.includes('no longer exists') ? 'This campaign was deleted, so it can’t be saved.' : "Couldn't save the campaign. Please try again.", 'error');
        } finally {
            setSaving(false);
        }
    };

    const cancel = () => {
        if (dirty && !saving) setLeaving(true);
        else onCancel();
    };

    const appliedSoFar = useMemo(() => (isEdit && campaign ? (creators || []).filter(c => (c.joinedCampaigns || []).includes(campaign.id)).length : 0), [isEdit, campaign, creators]);
    const previewData = useMemo(() => ({ ...toPayload(form), id: 'preview' }), [form]);
    const nicheSet = new Set(form.preferredNiches.map(nicheKey));

    if (isEdit && !campaign) {
        return (
            <Card className="rounded-2xl">
                {loaded ? (
                    <EmptyState icon={AlertCircle} tone="rose" title="Campaign not found" description="It may have been deleted, or the link is wrong." action={<Button onClick={onCancel}>Back to campaigns</Button>} />
                ) : (
                    <div className="flex justify-center py-16 text-gray-400"><Spinner className="h-6 w-6" /></div>
                )}
            </Card>
        );
    }

    const editReady = !isEdit || readyFor === campaign?.id;
    const primaryLabel = saving ? 'Saving…' : isEdit ? 'Save changes' : form.status === 'Open' ? 'Publish campaign' : form.status === 'Draft' ? 'Save draft' : 'Create campaign';
    const err = (key) => errors[key] && <p className="mt-1 text-[12px] font-semibold text-rose-600 dark:text-rose-300">{errors[key]}</p>;
    const cityInList = form.targetCity === 'Any' || PREDEFINED_CITIES.includes(form.targetCity);

    return (
        <div className="pb-28 sm:pb-10">
            {/* Top bar */}
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 mb-4 flex items-center gap-2 border-b border-black/[0.06] bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b10]/90 sm:-mx-6 sm:px-6 lg:top-0">
                <button type="button" onClick={cancel} className="flex h-10 items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    <ChevronLeft size={16} /> Campaigns
                </button>
                <p className="min-w-0 flex-1 truncate text-[15px] font-bold">
                    {isEdit ? (form.title || 'Edit campaign') : source ? 'Duplicate campaign' : 'New campaign'}
                    {dirty && <span className="ml-2 text-[12px] font-semibold text-amber-600 dark:text-amber-300">Unsaved</span>}
                </p>
                <Button variant="secondary" onClick={() => setShowPreviewMobile(v => !v)} className="h-10 xl:hidden">
                    {showPreviewMobile ? <EyeOff size={14} /> : <Eye size={14} />} {showPreviewMobile ? 'Edit' : 'Preview'}
                </Button>
                {!isEdit && form.status !== 'Draft' && (
                    <Button variant="ghost" onClick={() => save('Draft')} disabled={saving} className="hidden h-10 sm:inline-flex">Save as draft</Button>
                )}
                <Button variant="primary" onClick={() => save()} disabled={saving || !editReady || Object.values(uploading).some(Boolean)} className="hidden h-10 sm:inline-flex">
                    {saving && <Spinner />} {primaryLabel}
                </Button>
            </div>

            {/* Section jump */}
            <div className={cn('-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden', showPreviewMobile && 'hidden xl:block')}>
                <div className="flex gap-1.5">
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="h-9 shrink-0 rounded-full border border-black/10 px-3.5 text-[12.5px] font-semibold text-gray-600 hover:border-black/25 hover:text-gray-900 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/25 dark:hover:text-white"
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form
                    id="campaign-editor"
                    onSubmit={(e) => { e.preventDefault(); save(); }}
                    noValidate
                    className={cn('space-y-5', showPreviewMobile && 'hidden xl:block')}
                >
                    <BuilderCard id="cm-basics" title="Basics" hint="What the campaign is and whose it is">
                        <div className="space-y-4">
                            <Field label="Campaign title">
                                <input id="cm-field-title" className={cn(fieldCls, errors.title && 'border-rose-500/60')} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Red Bull campus takeover" />
                                {err('title')}
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
                                <Field label="Brand" optional>
                                    <input className={fieldCls} value={form.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="e.g. Red Bull" />
                                </Field>
                                <ImageSlot
                                    label={uploading.brandLogo ? 'Brand logo · uploading…' : 'Brand logo'}
                                    aspect="aspect-[3/1] sm:aspect-[2/1]"
                                    contain
                                    previewUrl={form.brandLogo}
                                    url={form.brandLogo}
                                    onFile={(f) => upload('brandLogo', f, (url) => set({ brandLogo: url }))}
                                    onUrl={(v) => set({ brandLogo: v })}
                                    onClear={() => set({ brandLogo: '' })}
                                    onPaste={(e) => { const f = firstImageFrom(e); if (f) { e.preventDefault(); upload('brandLogo', f, (url) => set({ brandLogo: url })); } }}
                                />
                            </div>
                            <div>
                                <span className="mb-1 block text-[12px] font-bold text-gray-500">Status</span>
                                <Choice
                                    value={['Open', 'Draft', 'Live'].includes(form.status) ? form.status : 'Closed'}
                                    onChange={(v) => set({ status: v })}
                                    options={[
                                        { value: 'Open', label: 'Open', hint: 'Live, creators can apply' },
                                        { value: 'Draft', label: 'Draft', hint: 'Hidden from creators' },
                                        { value: 'Closed', label: 'Closed', hint: 'Visible, no new applicants' },
                                        { value: 'Live', label: 'Live', hint: 'Event is on, applications closed' },
                                    ]}
                                />
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard id="cm-brief" title="Brief" hint="What the brand wants and the vibe. Creators read this before applying.">
                        <div className="space-y-4">
                            <div id="cm-field-description">
                                <RichEditor value={form.description} onChange={(v) => set({ description: v })} placeholder="The brand, the goal, the tone, do's and don'ts…" minHeight={180} label="Campaign brief" stripStyles />
                                {err('description')}
                            </div>
                            <Field label="WhatsApp group for shortlisted creators" optional hint="Sent in the shortlist welcome (email and WhatsApp), and shown as a button in the campaign.">
                                <input className={fieldCls} value={form.whatsappLink} onChange={(e) => set({ whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/…" inputMode="url" autoCapitalize="off" />
                            </Field>
                        </div>
                    </BuilderCard>

                    <BuilderCard
                        id="cm-deliverables"
                        title={`Deliverables${form.tasks.length ? ` · ${form.tasks.length}` : ''}`}
                        hint="What each selected creator has to post or do"
                    >
                        <div className="space-y-3">
                            {form.tasks.length === 0 && (
                                <div className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-center dark:border-white/10">
                                    <Layers size={20} className="mx-auto text-gray-400" />
                                    <p className="mt-2 text-[14px] font-bold">No deliverables yet</p>
                                    <p className="text-[12px] text-gray-500">Add a story, reel or post below. Selected creators see them as tasks.</p>
                                </div>
                            )}
                            {form.tasks.map((t, i) => (
                                <TaskCard
                                    key={t.id || i}
                                    task={t}
                                    index={i}
                                    total={form.tasks.length}
                                    open={openTask === t.id}
                                    onToggle={() => setOpenTask(o => (o === t.id ? null : t.id))}
                                    submissionsCount={submissionsCount(t)}
                                    onChange={setTask}
                                    onMove={moveTask}
                                    onDuplicate={duplicateTask}
                                    onRemove={askRemoveTask}
                                    onShare={isEdit && campaign?.tasks?.some(x => String(x.id) === String(t.id)) ? (taskId) => onCopyTaskLink(taskId) : null}
                                    uploading={Boolean(uploading[`task-${t.id}`])}
                                    onUploadAsset={(index, file) => upload(`task-${t.id}`, file, (url) => setForm(prev => ({
                                        ...prev,
                                        tasks: prev.tasks.map((x, j) => (j === index ? { ...x, creativeAssets: [...(x.creativeAssets || []), url] } : x)),
                                    })))}
                                />
                            ))}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {TASK_TYPES.map(tt => (
                                    <button
                                        key={tt.value}
                                        type="button"
                                        onClick={() => addTask(tt.value)}
                                        className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-black/10 text-[13px] font-semibold transition-colors hover:border-pink-500/40 hover:bg-pink-500/[0.05] dark:border-white/10 dark:hover:border-neon-pink/40"
                                    >
                                        <Plus size={14} className="text-pink-500 dark:text-neon-pink" /> {tt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard id="cm-eligibility" title="Who can apply" hint="Applicants who meet these are marked as a match, and can be auto-selected">
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="City">
                                    <ThemedSelect
                                        className={cn(fieldCls, 'cursor-pointer')}
                                        value={otherCity || !cityInList ? '__other' : form.targetCity}
                                        onChange={(e) => {
                                            if (e.target.value === '__other') { setOtherCity(true); set({ targetCity: cityInList ? '' : form.targetCity }); }
                                            else { setOtherCity(false); set({ targetCity: e.target.value }); }
                                        }}
                                    >
                                        <option value="Any">Anywhere in India</option>
                                        {PREDEFINED_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="__other">Another city…</option>
                                    </ThemedSelect>
                                </Field>
                                <Field label="Minimum Instagram followers" optional>
                                    <input className={fieldCls} type="number" min="0" inputMode="numeric" value={form.minInstagramFollowers} onChange={(e) => set({ minInstagramFollowers: e.target.value })} placeholder="0 = anyone" />
                                </Field>
                            </div>
                            {(otherCity || !cityInList) && (
                                <Field label="City name">
                                    <input className={fieldCls} value={form.targetCity} onChange={(e) => set({ targetCity: e.target.value })} placeholder="e.g. Chandigarh" autoFocus={otherCity && !form.targetCity} />
                                </Field>
                            )}
                            <Field label="College or university" optional hint="For campus campaigns. Leave empty for everyone.">
                                <input className={fieldCls} value={form.targetCollege} onChange={(e) => set({ targetCollege: e.target.value })} placeholder="e.g. Delhi University" />
                            </Field>
                            <div>
                                <span className="mb-1 block text-[12px] font-bold text-gray-500">Preferred niches <span className="font-medium">(optional)</span></span>
                                <p className="mb-2 text-[12px] text-gray-500">Creators in these niches get a “niche match” tag in the applicant list. Anyone can still apply.</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {CREATOR_NICHES.filter(n => n !== 'Others').map(n => {
                                        const on = nicheSet.has(nicheKey(n));
                                        return (
                                            <button
                                                key={n}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() => set({ preferredNiches: on ? form.preferredNiches.filter(x => nicheKey(x) !== nicheKey(n)) : [...form.preferredNiches, n] })}
                                                className={cn('h-9 rounded-full border px-3 text-[12.5px] font-semibold transition-colors',
                                                    on ? cn(accent('pink').solid, 'border-transparent') : 'border-black/10 text-gray-600 hover:border-black/25 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/25')}
                                            >
                                                {n}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard id="cm-pay" title="Pay and spots" hint="What creators get, and how many you need">
                        <div className="space-y-4">
                            <Field label="Reward shown to creators">
                                <input id="cm-field-reward" className={cn(fieldCls, errors.reward && 'border-rose-500/60')} value={form.reward} onChange={(e) => set({ reward: e.target.value })} placeholder="e.g. ₹5,000 + product hamper" />
                                {err('reward')}
                            </Field>
                            <Field label="Payout per creator (₹)" optional hint="For your records: fills in when you mark someone paid and adds up campaign spend. Not shown to creators.">
                                <input className={fieldCls} type="number" min="0" inputMode="numeric" value={form.payoutPerCreator} onChange={(e) => set({ payoutPerCreator: e.target.value })} placeholder="e.g. 5000" />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Total spots" optional hint="Leave empty for no limit.">
                                    <input className={fieldCls} type="number" min="0" inputMode="numeric" value={form.totalSpots} onChange={(e) => set({ totalSpots: e.target.value })} placeholder="e.g. 50" />
                                </Field>
                                <Field label="Spots left" optional hint={form.totalSpots ? `Empty counts down as creators apply${isEdit ? ` (${appliedSoFar} applied, so ${Math.max(0, Number(form.totalSpots) - appliedSoFar)} left)` : ''}.` : 'Set total spots first, or type a fixed number.'}>
                                    <input id="cm-field-spotsLeft" className={cn(fieldCls, errors.spotsLeft && 'border-rose-500/60')} type="number" min="0" inputMode="numeric" value={form.spotsLeft} onChange={(e) => set({ spotsLeft: e.target.value })} placeholder="Automatic" />
                                    {err('spotsLeft')}
                                </Field>
                            </div>
                            {num(form.payoutPerCreator) > 0 && num(form.totalSpots) > 0 && (
                                <p className={cn('rounded-xl px-3.5 py-2.5 text-[13px] font-semibold', accent('teal').soft, accent('teal').text)}>
                                    Up to {inr(num(form.payoutPerCreator) * num(form.totalSpots))} if every spot is filled.
                                </p>
                            )}
                        </div>
                    </BuilderCard>

                    <BuilderCard id="cm-tickets" title="Event passes" hint="Optional: passes for selected creators, sent in the app, by email and on WhatsApp">
                        <div className="space-y-4">
                            <Field label="Pass" hint="A QR pass is scanned at the gate. A confirmation tells them they're in, with no QR code.">
                                <Choice
                                    value={form.passKind}
                                    onChange={(v) => set({ passKind: v })}
                                    options={[
                                        { value: 'qr', label: 'QR pass', hint: 'Scanned at the gate' },
                                        { value: 'confirmation', label: 'Confirmation', hint: 'No QR code' },
                                    ]}
                                />
                            </Field>
                            <Field label="Linked event" optional hint="Uses that event's name, date, venue and poster, and its gate scanner.">
                                <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={form.eventId} onChange={(e) => set({ eventId: e.target.value })}>
                                    <option value="">No linked event</option>
                                    {eventOptions.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                                </ThemedSelect>
                            </Field>
                            {!form.eventId && (
                                <div className="space-y-3 rounded-xl bg-black/[0.02] p-3.5 dark:bg-white/[0.03]">
                                    <p className="text-[13px] text-gray-500">Shown on the pass. Leave empty to use the campaign's name.{form.passKind === 'qr' ? ' Scan these passes by picking the campaign in the gate scanner.' : ''}</p>
                                    <Field label="Event name" optional>
                                        <input className={fieldCls} value={form.eventName} onChange={(e) => set({ eventName: e.target.value })} placeholder={form.title || 'e.g. Campus Week Finale'} maxLength={120} />
                                    </Field>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Date" optional>
                                            <input className={fieldCls} type="date" value={form.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
                                        </Field>
                                        <Field label="Time" optional>
                                            <input className={fieldCls} value={form.eventTime} onChange={(e) => set({ eventTime: e.target.value })} placeholder="e.g. 7 PM" maxLength={40} />
                                        </Field>
                                    </div>
                                    <Field label="Venue" optional>
                                        <input className={fieldCls} value={form.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="e.g. Main Ground, Christ University" maxLength={160} />
                                    </Field>
                                </div>
                            )}
                            <Field label="Tickets per creator">
                                <input className={fieldCls} type="number" min="1" max="20" inputMode="numeric" value={form.ticketsPerCreator} onChange={(e) => set({ ticketsPerCreator: e.target.value })} placeholder="1" />
                            </Field>
                            <Field label="Send passes automatically" hint="Official partner tickets (PDFs or links) are always sent by hand with a CSV.">
                                <Choice
                                    value={form.ticketAutoIssue}
                                    onChange={(v) => set({ ticketAutoIssue: v })}
                                    options={[
                                        { value: '', label: 'Off', hint: 'Send by hand' },
                                        { value: 'selected', label: 'On selection', hint: 'When you select a creator' },
                                        { value: 'completed', label: 'When done', hint: 'All required tasks approved' },
                                    ]}
                                />
                            </Field>
                        </div>
                    </BuilderCard>

                    <BuilderCard id="cm-dates" title="Deadlines" hint="When each deliverable is due. Creators see these on their tasks.">
                        {form.tasks.length === 0 ? (
                            <p className="text-[13px] text-gray-500">Add deliverables first, then set their due dates here.</p>
                        ) : (
                            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                                {form.tasks.map((t, i) => {
                                    const d = daysUntil(t.deadline);
                                    return (
                                        <li key={t.id || i} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[14px] font-semibold">{t.title || `Deliverable ${i + 1}`}</p>
                                                <p className={cn('text-[12px]', d !== null && d < 0 ? 'font-semibold text-rose-600 dark:text-rose-300' : 'text-gray-500')}>
                                                    {d === null ? 'No deadline' : d < 0 ? `Was due ${formatDay(t.deadline)}` : d === 0 ? 'Due today' : `Due ${formatDay(t.deadline)} · in ${d} day${d === 1 ? '' : 's'}`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 sm:w-[220px]">
                                                <input className={cn(fieldCls, 'h-11')} type="date" value={toDayInput(t.deadline)} onChange={(e) => setTask(i, { deadline: e.target.value })} aria-label={`Deadline for ${t.title || `deliverable ${i + 1}`}`} />
                                                {t.deadline && <Button variant="ghost" onClick={() => setTask(i, { deadline: '' })} className="h-11 px-3">Clear</Button>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </BuilderCard>

                    <OpenFormCard form={form} set={set} title={form.title} targetCity={form.targetCity} errors={errors} err={err} />

                    <BuilderCard id="cm-images" title="Images" hint="Upload, paste (Ctrl/Cmd+V) or link">
                        <ImageSlot
                            label={uploading.thumbnail ? 'Campaign image · uploading…' : 'Campaign image (16:9)'}
                            hint="Shown on the campaign card and page"
                            aspect="aspect-video"
                            previewUrl={form.thumbnail}
                            url={form.thumbnail}
                            onFile={(f) => upload('thumbnail', f, (url) => set({ thumbnail: url }))}
                            onUrl={(v) => set({ thumbnail: v })}
                            onClear={() => set({ thumbnail: '' })}
                            onPaste={(e) => { const f = firstImageFrom(e); if (f) { e.preventDefault(); upload('thumbnail', f, (url) => set({ thumbnail: url })); } }}
                        />
                    </BuilderCard>

                    <BuilderCard id="cm-visibility" title="Visibility" hint="Who sees it and what happens when people apply">
                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                            <div className="py-2"><Toggle label="Apply from the website" hint="Creators can apply from the public campaign page" checked={form.websiteApplyEnabled} onChange={(v) => set({ websiteApplyEnabled: v })} /></div>
                            {form.websiteApplyEnabled && (
                                <div className="space-y-3 py-3">
                                    <Field label="How creators apply">
                                        <Choice
                                            value={form.applyMethod}
                                            onChange={(v) => set({ applyMethod: v })}
                                            options={[
                                                { value: 'newbi', label: 'Newbi ID', hint: '1-click apply' },
                                                { value: 'form', label: 'Google Form', hint: 'Opens in the app' },
                                                { value: 'both', label: 'Either', hint: '1-click or the form' },
                                            ]}
                                        />
                                    </Field>
                                    {form.applyMethod !== 'newbi' && (
                                        <Field
                                            label="Google Form link"
                                            hint="Tip: in Google Forms, use “Get pre-filled link” and type {name}, {email}, {phone}, {instagram}, {followers}, {city} or {newbiId} as answers. We fill them in for each creator."
                                        >
                                            <input id="cm-field-applyFormUrl" className={cn(fieldCls, errors.applyFormUrl && 'border-rose-500/60')} value={form.applyFormUrl} onChange={(e) => set({ applyFormUrl: e.target.value })} placeholder="https://forms.gle/…" inputMode="url" autoCapitalize="off" />
                                            {err('applyFormUrl')}
                                        </Field>
                                    )}
                                    {form.applyMethod !== 'newbi' && (
                                        <Toggle
                                            label="The form asks for a Google sign-in"
                                            hint="Turn on for forms with file uploads. Google won't show those inside the app, so it opens in a new tab."
                                            checked={form.applyFormNeedsSignIn}
                                            onChange={(v) => set({ applyFormNeedsSignIn: v })}
                                        />
                                    )}
                                </div>
                            )}
                            <div className="py-2"><Toggle label="Pin to the top" hint="Shows first in lists" checked={form.isPinned} onChange={(v) => set({ isPinned: v })} /></div>
                            {goingLive && (
                                <div className="py-2"><Toggle label="Tell matching creators" hint="Email and app notification to creators in the target city when it goes live" checked={announce} onChange={setAnnounce} /></div>
                            )}
                        </div>
                    </BuilderCard>
                </form>

                <aside className={cn('mx-auto w-full max-w-sm space-y-3 xl:sticky xl:top-24 xl:max-w-none xl:self-start', !showPreviewMobile && 'hidden xl:block')}>
                    <p className="text-[12px] font-bold text-gray-500">Live preview · how creators see the card</p>
                    <LivePreview type="campaign" data={previewData} hideDecorations />
                    <div className="rounded-2xl border border-black/[0.06] p-4 text-[13px] dark:border-white/[0.08]">
                        <p className="font-bold">Checklist</p>
                        <ul className="mt-2 space-y-1.5 text-gray-600 dark:text-zinc-300">
                            {[
                                [Boolean(form.title.trim()), 'Title'],
                                [Boolean(stripHtml(form.description)), 'Brief'],
                                [form.tasks.length > 0, 'At least one deliverable'],
                                [Boolean(form.reward.trim()), 'Reward'],
                                [Boolean(form.thumbnail), 'Campaign image'],
                            ].map(([ok, label]) => (
                                <li key={label} className="flex items-center gap-2">
                                    <span className={cn('h-2 w-2 rounded-full', ok ? accent('green').dot : 'bg-black/15 dark:bg-white/20')} />
                                    <span className={ok ? '' : 'text-gray-400'}>{label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>

            {/* Phone save bar */}
            <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b10]/95 sm:hidden">
                <div className="flex gap-2">
                    {!isEdit && form.status !== 'Draft' ? (
                        <Button variant="secondary" onClick={() => save('Draft')} disabled={saving} className="h-12">Draft</Button>
                    ) : (
                        <Button variant="ghost" onClick={cancel} className="h-12">Cancel</Button>
                    )}
                    <Button variant="primary" onClick={() => save()} disabled={saving || !editReady || Object.values(uploading).some(Boolean)} className="h-12 flex-1">
                        {saving && <Spinner />} {primaryLabel}
                    </Button>
                </div>
            </div>

            <ConfirmSheet
                open={removeTask !== null}
                onClose={() => setRemoveTask(null)}
                title="Remove this deliverable?"
                tone="danger"
                confirmLabel="Remove"
                message={removeTask !== null && (
                    submissionsCount(form.tasks[removeTask] || {}) > 0
                        ? `${submissionsCount(form.tasks[removeTask])} creator${submissionsCount(form.tasks[removeTask]) === 1 ? ' has' : 's have'} already submitted for “${form.tasks[removeTask]?.title}”. Their submissions go with it when you save.`
                        : `“${form.tasks[removeTask]?.title || 'This deliverable'}” and its links and instructions will be removed when you save.`
                )}
                onConfirm={() => { setForm(prev => ({ ...prev, tasks: prev.tasks.filter((_, i) => i !== removeTask) })); setRemoveTask(null); }}
            />
            <ConfirmSheet
                open={leaving}
                onClose={() => setLeaving(false)}
                title="Leave without saving?"
                tone="danger"
                confirmLabel="Discard changes"
                message="Your changes to this campaign haven't been saved."
                onConfirm={() => { setLeaving(false); onCancel(); }}
            />
        </div>
    );
};

export default CampaignEditor;
