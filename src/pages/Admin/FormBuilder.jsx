import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Plus from 'lucide-react/dist/esm/icons/plus';
import FileSearch from 'lucide-react/dist/esm/icons/file-search';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import LivePreview from '../../components/admin/LivePreview';
import { Button, EmptyState, SegmentedTabs } from '../../components/admin/ui';
import { BuilderCard, ImageSlot, splitDateTime } from '../../components/admin/events/EditorParts';
import { Field, Toggle, Choice, fieldCls, areaCls } from '../../components/admin/uploads/UploadKit';
import FormRenderer from '../../components/admin/forms/FormRenderer';
import { FieldPalette, QuestionCard } from '../../components/admin/forms/BuilderParts';
import { builderProblems, copyField, newField, starterFields } from '../../components/admin/forms/formSchema';
import { ColorDots, EditorBar, PhoneBar, useConfirm, useImageField, useUnsavedWarning } from '../../components/admin/forms/kit';

const EMPTY = {
    title: '',
    description: '',
    activeLabel: 'Live',
    bottomText: '',
    buttonText: '',
    formUrl: '',
    requiresExternal: false,
    image: '',
    highlightColor: '#FF4F8B',
    isPinned: false,
    imageTransform: { scale: 1.05, x: 0, y: 0 },
    fields: [],
    closesAt: '',
    responseLimit: '',
    onePerPerson: false,
    requireSignIn: false,
    confirmationMessage: '',
    submitLabel: '',
};

const STATUS_OPTIONS = [
    { value: 'Live', label: 'Live', hint: 'Taking responses' },
    { value: 'Few Slots Remain', label: 'Filling fast', hint: 'Shows urgency' },
    { value: 'Closed', label: 'Closed', hint: 'No new responses' },
];

const cleanUrl = (value) => {
    const v = String(value || '').trim();
    if (v.includes('<iframe')) return v.match(/src="([^"]+)"/)?.[1] || v;
    return v;
};

const FormBuilder = () => {
    useStoreSubscription(['forms', 'upcomingEvents']);
    const { id } = useParams();
    const navigate = useNavigate();
    const forms = useStore(s => s.forms) || [];
    const upcomingEvents = useStore(s => s.upcomingEvents) || [];
    const loaded = useStore(s => s.subscriptionsLoaded?.forms);
    const addToast = useStore(s => s.addToast);

    const [form, setForm] = useState(EMPTY);
    const [mode, setMode] = useState('native');
    const [homeCard, setHomeCard] = useState(false);
    const [notify, setNotify] = useState(true);
    const [notifyEmail, setNotifyEmail] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [dragFrom, setDragFrom] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
    const [previewTab, setPreviewTab] = useState('form');
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [showProblems, setShowProblems] = useState(false);
    const [confirm, confirmEl] = useConfirm();
    const loadedFor = useRef(null);

    useUnsavedWarning(dirty);

    const existing = id ? forms.find(f => f.id === id) : null;

    // Load the saved form once (later snapshots must not wipe edits in progress).
    useEffect(() => {
        if (!id || !existing || loadedFor.current === id) return;
        loadedFor.current = id;
        const native = Array.isArray(existing.fields) && existing.fields.length > 0;
        setForm({
            ...EMPTY,
            ...existing,
            fields: existing.fields || [],
            imageTransform: existing.imageTransform || EMPTY.imageTransform,
            responseLimit: existing.responseLimit || '',
        });
        setMode(native || !existing.formUrl ? 'native' : 'google');
        setPreviewTab(native || !existing.formUrl ? 'form' : 'card');
        setHomeCard((upcomingEvents || []).some(e => e.formId === id || e.link === `/forms/${id}`));
    }, [id, existing, upcomingEvents]);

    const set = (patch) => { setForm(prev => ({ ...prev, ...patch })); setDirty(true); };
    const image = useImageField(form.image, (url) => set({ image: url }));

    // ── questions ──
    const fields = form.fields || [];
    const setFields = (next) => set({ fields: next });
    const addField = (type) => {
        const f = newField(type);
        setFields([...fields, f]);
        setExpanded(f.id);
        setTimeout(() => document.getElementById(`field_${f.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    };
    const updateField = (fid, patch) => setFields(fields.map(f => (f.id === fid ? { ...f, ...patch } : f)));
    const moveField = (from, to) => {
        if (from === to || to < 0 || to >= fields.length) return;
        const next = [...fields];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        setFields(next);
    };
    const duplicateField = (i) => {
        const copy = copyField(fields[i]);
        const next = [...fields];
        next.splice(i + 1, 0, copy);
        setFields(next);
        setExpanded(copy.id);
    };
    const deleteField = async (i) => {
        const f = fields[i];
        if (existing?.responseCount > 0 && existing.fields?.some(x => x.id === f.id)) {
            const ok = await confirm({
                title: 'Delete this question?',
                body: 'Answers people already gave to it stay in their responses, but new responses won’t ask it.',
                confirmLabel: 'Delete question',
            });
            if (!ok) return;
        }
        setFields(fields.filter((_, j) => j !== i));
    };

    const problems = useMemo(() => (mode === 'native' ? builderProblems(fields) : {}), [fields, mode]);
    const answerable = fields.filter(f => f.type !== 'heading').length;

    // ── preview data ──
    const previewForm = { ...form, id: id || 'preview', fields };
    const cardData = { ...form, formUrl: mode === 'google' ? cleanUrl(form.formUrl) : '' };

    // ── save ──
    const problemList = () => {
        const list = [];
        if (!form.title.trim()) list.push('Give the form a title.');
        if (mode === 'native') {
            if (!answerable) list.push('Add at least one question.');
            if (Object.keys(problems).length) list.push('Some questions need a fix.');
        } else {
            const url = cleanUrl(form.formUrl);
            if (!/^https?:\/\/\S+/i.test(url)) list.push('Paste the Google Form link.');
        }
        if (form.responseLimit !== '' && (!Number.isInteger(Number(form.responseLimit)) || Number(form.responseLimit) < 1)) list.push('The response limit must be a whole number above 0.');
        return list;
    };

    const save = async (e) => {
        e?.preventDefault();
        if (saving) return;
        setShowProblems(true);
        const list = problemList();
        if (list.length) {
            addToast(list[0], 'error');
            const firstBad = fields.find(f => problems[f.id]);
            if (firstBad) { setExpanded(firstBad.id); document.getElementById(`field_${firstBad.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            return;
        }
        if (mode === 'google' && existing?.fields?.length && existing.responseCount > 0) {
            const ok = await confirm({
                title: 'Switch to the Google Form?',
                body: 'People will fill the Google Form instead. Responses already collected here stay in the responses list.',
                confirmLabel: 'Switch',
                tone: 'accent',
            });
            if (!ok) return;
        }

        const { id: _id, createdAt, responseCount, lastResponseAt, ...rest } = form;
        const payload = {
            ...rest,
            title: form.title.trim(),
            formUrl: mode === 'google' ? cleanUrl(form.formUrl) : (form.formUrl || ''),
            fields: mode === 'native' ? fields.map(f => ({ ...f, label: String(f.label || '').trim(), options: f.options ? f.options.map(o => String(o).trim()) : undefined })).map(f => JSON.parse(JSON.stringify(f))) : [],
            responseLimit: form.responseLimit === '' ? null : Number(form.responseLimit),
            closesAt: form.closesAt || null,
            alsoPostToUpcomingEvents: homeCard,
            updatedAt: new Date().toISOString(),
        };

        setSaving(true);
        try {
            let savedId = id;
            if (id) {
                await useStore.getState().updateForm(id, payload);
            } else {
                savedId = await useStore.getState().addForm({ ...payload, responseCount: 0, createdAt: new Date().toISOString() });
                if (notify && savedId) {
                    notifyAllUsers(
                        `New form: ${payload.title}`,
                        payload.description || "We've shared a new form. Please take a moment to fill it out.",
                        `/forms/${savedId}`,
                        payload.image || '',
                        notifyEmail
                    ).catch(err => console.warn('Form notification failed:', err));
                }
            }
            setDirty(false);
            const link = `${window.location.origin}/forms/${savedId}`;
            addToast(id ? 'Form saved.' : 'Form published.', 'success', { action: { label: 'Copy link', onClick: () => copyToClipboard(link) } });
            navigate('/admin/forms');
        } catch (err) {
            console.error('Error saving form:', err);
            addToast("Couldn't save the form. Please try again.", 'error');
        } finally {
            setSaving(false);
        }
    };

    const leave = async () => {
        if (dirty && !(await confirm({ title: 'Leave without saving?', body: 'Your changes to this form will be lost.', confirmLabel: 'Leave', cancelLabel: 'Keep editing' }))) return;
        setDirty(false);
        navigate('/admin/forms');
    };

    const closes = splitDateTime(form.closesAt || '');
    const setCloses = (date, time) => set({ closesAt: date ? new Date(`${date}T${time || '23:59'}`).toISOString() : '' });

    if (id && loaded && !existing && loadedFor.current !== id) {
        return (
            <AdminCommunityHubLayout studioHeader={{ title: 'Forms', icon: ClipboardList, description: 'Questions, responses and sign-ups' }}>
                <EmptyState icon={FileSearch} title="Form not found" description="It may have been deleted." action={<Button variant="accent" onClick={() => navigate('/admin/forms')}>Back to forms</Button>} />
            </AdminCommunityHubLayout>
        );
    }

    const saveLabel = saving ? 'Saving…' : id ? 'Save changes' : 'Publish form';

    return (
        <AdminCommunityHubLayout studioHeader={{ title: id ? 'Edit form' : 'New form', icon: ClipboardList, description: 'Build the questions, preview, publish' }} hideTabs>
            <div className="pb-28 sm:pb-10">
                <EditorBar backLabel="Forms" onBack={leave} title={form.title || (id ? 'Edit form' : 'New form')}>
                    <Button variant="secondary" onClick={() => setShowPreviewMobile(v => !v)} className="h-10 xl:hidden">
                        {showPreviewMobile ? <EyeOff size={14} /> : <Eye size={14} />} {showPreviewMobile ? 'Edit' : 'Preview'}
                    </Button>
                    <Button variant="primary" type="submit" form="form-editor" disabled={saving || image.uploading} className="hidden h-10 sm:inline-flex">{saveLabel}</Button>
                </EditorBar>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                    <form id="form-editor" onSubmit={save} noValidate className={cn('space-y-5', showPreviewMobile && 'hidden xl:block')}>
                        <BuilderCard title="Details" hint="What people see at the top of the form">
                            <div className="space-y-3">
                                <Field label="Title">
                                    <input className={cn(fieldCls, showProblems && !form.title.trim() && 'border-red-500/60')} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Volunteer sign-up for Sunburn" />
                                </Field>
                                <Field label="Description" optional>
                                    <textarea className={areaCls} rows={3} value={form.description || ''} onChange={(e) => set({ description: e.target.value })} placeholder="What this form is for and what happens next" />
                                </Field>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Location label" optional hint="Shown on the card, e.g. Online or Bengaluru">
                                        <input className={fieldCls} value={form.bottomText || ''} onChange={(e) => set({ bottomText: e.target.value })} placeholder="e.g. Online" />
                                    </Field>
                                    <Field label="Card button text" optional>
                                        <input className={fieldCls} value={form.buttonText || ''} onChange={(e) => set({ buttonText: e.target.value })} placeholder="e.g. Fill form" />
                                    </Field>
                                </div>
                            </div>
                        </BuilderCard>

                        <BuilderCard title="How people answer">
                            <Choice
                                value={mode}
                                onChange={(v) => { setMode(v); setDirty(true); setPreviewTab(v === 'native' ? 'form' : 'card'); }}
                                options={[
                                    { value: 'native', label: 'Build it here', hint: 'Responses, file uploads and limits in the admin' },
                                    { value: 'google', label: 'Use a Google Form', hint: 'Embed a form you already have' },
                                ]}
                            />
                        </BuilderCard>

                        {mode === 'native' ? (
                            <BuilderCard
                                title="Questions"
                                hint={answerable ? `${answerable} question${answerable === 1 ? '' : 's'} · drag or use the arrows to reorder` : 'Pick a question type to add it'}
                            >
                                {fields.length === 0 ? (
                                    <div className="space-y-4">
                                        <button type="button" onClick={() => { setFields(starterFields()); }} className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-500/30 p-4 text-left transition-colors hover:border-indigo-500/60">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"><Sparkles size={18} /></span>
                                            <span>
                                                <span className="block text-[14px] font-bold">Start with name, email and phone</span>
                                                <span className="block text-[12px] text-gray-500">The three questions almost every form needs</span>
                                            </span>
                                        </button>
                                        <FieldPalette onAdd={addField} />
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {fields.map((f, i) => (
                                            <div key={f.id} id={`field_${f.id}`} className="scroll-mt-32">
                                                <QuestionCard
                                                    field={f}
                                                    index={fields.slice(0, i).filter(x => x.type !== 'heading').length}
                                                    total={fields.length}
                                                    expanded={expanded === f.id}
                                                    onToggle={() => setExpanded(expanded === f.id ? null : f.id)}
                                                    onChange={(patch) => updateField(f.id, patch)}
                                                    onMove={(d) => moveField(i, i + d)}
                                                    onDuplicate={() => duplicateField(i)}
                                                    onDelete={() => deleteField(i)}
                                                    problem={showProblems || expanded === f.id ? problems[f.id] : null}
                                                    dragOver={dragOver === i && dragFrom !== null && dragFrom !== i}
                                                    dragProps={{
                                                        draggable: expanded !== f.id,
                                                        onDragStart: (e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); },
                                                        onDragOver: (e) => { if (dragFrom === null) return; e.preventDefault(); setDragOver(i); },
                                                        onDrop: (e) => { e.preventDefault(); if (dragFrom !== null) moveField(dragFrom, i); setDragFrom(null); setDragOver(null); },
                                                        onDragEnd: () => { setDragFrom(null); setDragOver(null); },
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        <div className="pt-3">
                                            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-gray-500"><Plus size={13} /> Add a question</p>
                                            <FieldPalette onAdd={addField} compact />
                                        </div>
                                    </div>
                                )}
                            </BuilderCard>
                        ) : (
                            <BuilderCard
                                title="Google Form"
                                hint="Paste the link or the embed code"
                                action={<button type="button" onClick={() => setShowHelp(v => !v)} className="flex h-9 items-center gap-1 text-[12px] font-semibold text-indigo-600 dark:text-indigo-300"><HelpCircle size={13} /> Where to find it</button>}
                            >
                                <div className="space-y-3">
                                    {showHelp && (
                                        <ol className="list-decimal space-y-1 rounded-xl bg-black/[0.03] p-4 pl-8 text-[13px] text-gray-600 dark:bg-white/[0.04] dark:text-zinc-300">
                                            <li>Open the Google Form in edit mode and press Send.</li>
                                            <li>Open the embed tab (the &lt; &gt; icon).</li>
                                            <li>Copy the whole code, or just the link inside src="…", and paste it here.</li>
                                        </ol>
                                    )}
                                    <Field label="Form link">
                                        <input className={cn(fieldCls, 'font-mono text-[13px]', showProblems && !/^https?:\/\//i.test(cleanUrl(form.formUrl)) && 'border-red-500/60')} inputMode="url" autoCapitalize="off" value={form.formUrl || ''} onChange={(e) => set({ formUrl: e.target.value })} placeholder="https://docs.google.com/forms/d/e/…/viewform" />
                                    </Field>
                                    <Toggle label="Open in a new tab" hint="Needed when the Google Form has file uploads or asks people to sign in to Google" checked={Boolean(form.requiresExternal)} onChange={(v) => set({ requiresExternal: v })} />
                                </div>
                            </BuilderCard>
                        )}

                        <BuilderCard title="Responses" hint="When the form stops taking answers">
                            <div className="space-y-4">
                                <div>
                                    <p className="mb-1.5 text-[12px] font-bold text-gray-500">Status</p>
                                    <Choice value={form.activeLabel || 'Live'} onChange={(v) => set({ activeLabel: v })} options={STATUS_OPTIONS} />
                                </div>
                                {mode === 'native' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            <Field label="Close on" optional>
                                                <input className={fieldCls} type="date" value={closes.date} onChange={(e) => setCloses(e.target.value, closes.time)} />
                                            </Field>
                                            <Field label="at" optional>
                                                <input className={fieldCls} type="time" value={closes.time} disabled={!closes.date} onChange={(e) => setCloses(closes.date, e.target.value)} />
                                            </Field>
                                            <Field label="Response limit" optional className="col-span-2 sm:col-span-1">
                                                <input className={fieldCls} type="number" min="1" inputMode="numeric" value={form.responseLimit ?? ''} onChange={(e) => set({ responseLimit: e.target.value })} placeholder="No limit" />
                                            </Field>
                                        </div>
                                        {form.closesAt && <button type="button" onClick={() => set({ closesAt: '' })} className="-mt-2 h-9 text-[12px] font-semibold text-red-500">Remove closing date</button>}
                                        <Toggle label="One response per person" hint="People sign in and can only send it once" checked={Boolean(form.onePerPerson)} onChange={(v) => set({ onePerPerson: v })} />
                                        <Toggle label="Require sign-in" hint="Responses are linked to people's Newbi accounts" checked={Boolean(form.requireSignIn || form.onePerPerson)} onChange={(v) => set({ requireSignIn: v, ...(v ? {} : { onePerPerson: false }) })} />
                                        <Field label="Message after sending" optional>
                                            <textarea className={areaCls} rows={2} value={form.confirmationMessage || ''} onChange={(e) => set({ confirmationMessage: e.target.value })} placeholder="We'll be in touch if we need anything else." />
                                        </Field>
                                        <Field label="Submit button" optional>
                                            <input className={fieldCls} value={form.submitLabel || ''} onChange={(e) => set({ submitLabel: e.target.value })} placeholder="Submit" />
                                        </Field>
                                    </>
                                )}
                            </div>
                        </BuilderCard>

                        <BuilderCard title="Look" hint="Card image and colour on the community page">
                            <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
                                <ImageSlot
                                    label={image.uploading ? 'Uploading…' : 'Cover image'}
                                    hint="Paste works too"
                                    aspect="aspect-[4/3]"
                                    {...image.slotProps}
                                    transform={form.imageTransform}
                                    onTransform={(t) => set({ imageTransform: t })}
                                />
                                <div>
                                    <p className="mb-2 text-[12px] font-bold text-gray-500">Highlight colour</p>
                                    <ColorDots value={form.highlightColor} onChange={(v) => set({ highlightColor: v })} />
                                </div>
                            </div>
                        </BuilderCard>

                        <BuilderCard title="Where it shows">
                            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                                <div className="pb-3"><Toggle label="Spotlight on the community page" hint="Pinned to the featured row at the top" checked={Boolean(form.isPinned)} onChange={(v) => set({ isPinned: v })} /></div>
                                <div className="py-3"><Toggle label="Show on the home page" hint="Adds a card to Upcoming events" checked={homeCard} onChange={(v) => { setHomeCard(v); setDirty(true); }} /></div>
                                {!id && (
                                    <>
                                        <div className="py-3"><Toggle label="Notify everyone when it's published" hint="An in-app and push notification" checked={notify} onChange={setNotify} /></div>
                                        {notify && <div className="pt-3"><Toggle label="Also email everyone" hint="Sends to the whole mailing list" checked={notifyEmail} onChange={setNotifyEmail} /></div>}
                                    </>
                                )}
                            </div>
                        </BuilderCard>
                    </form>

                    <aside className={cn('mx-auto w-full max-w-md space-y-3 xl:sticky xl:top-24 xl:max-w-none xl:self-start', !showPreviewMobile && 'hidden xl:block')}>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] font-bold text-gray-500">Live preview</p>
                            <SegmentedTabs
                                value={previewTab}
                                onChange={setPreviewTab}
                                items={mode === 'native'
                                    ? [{ value: 'form', label: 'Form' }, { value: 'card', label: 'Card' }]
                                    : [{ value: 'card', label: 'Card' }, { value: 'embed', label: 'Embed' }]}
                            />
                        </div>
                        {previewTab === 'form' && mode === 'native' ? (
                            <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-zinc-950">
                                <div className="border-b border-black/[0.06] p-5 dark:border-white/[0.06]">
                                    <p className="text-[20px] font-extrabold leading-tight">{form.title || 'Untitled form'}</p>
                                    {form.description && <p className="mt-1 whitespace-pre-line text-[14px] text-gray-500">{form.description}</p>}
                                </div>
                                {answerable || fields.length ? (
                                    <FormRenderer key={fields.map(f => f.id).join()} form={previewForm} preview className="p-5 sm:p-5" />
                                ) : (
                                    <p className="p-8 text-center text-[13px] text-gray-500">Add a question and it appears here. Try filling it in: required answers and checks work like the real thing.</p>
                                )}
                            </div>
                        ) : previewTab === 'embed' ? (
                            <LivePreview type="form_embed" data={{ formUrl: cleanUrl(form.formUrl), requiresExternal: form.requiresExternal }} />
                        ) : (
                            <LivePreview type="form" data={cardData} />
                        )}
                    </aside>
                </div>

                <PhoneBar>
                    <Button variant="ghost" onClick={leave} className="h-12">Cancel</Button>
                    <Button variant="primary" type="submit" form="form-editor" disabled={saving || image.uploading} className="h-12 flex-1">{saveLabel}</Button>
                </PhoneBar>
            </div>
            {confirmEl}
        </AdminCommunityHubLayout>
    );
};

export default FormBuilder;
