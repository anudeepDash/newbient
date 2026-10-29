import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import X from 'lucide-react/dist/esm/icons/x';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Users from 'lucide-react/dist/esm/icons/users';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Check from 'lucide-react/dist/esm/icons/check';
import Minus from 'lucide-react/dist/esm/icons/minus';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { useStore } from '../../../lib/store';
import { notifyAllUsers } from '../../../lib/notificationTriggers';
import { notifyEvent } from '../../../lib/mailApi';
import { computeAvailability } from '../../../lib/ticketing';
import { cn } from '../../../lib/utils';
import LivePreview from '../LivePreview';
import { Button } from '../ui';
import ThemedSelect from '../ThemedSelect';
import CityInput from '../CityInput';
import GuestlistTaskConfig from '../GuestlistTaskConfig';
import { Field, Toggle, Choice, fieldCls, areaCls } from '../uploads/UploadKit';
import { AmbientColorField, EditorBar, PhoneBar, useConfirm, useImageField, useUnsavedWarning } from '../forms/kit';
import { BuilderCard, ImageSlot } from './EditorParts';
import TicketTiers from './TicketTiers';
import {
    appPathFor, eventProblems, formatWhen, fromEvent, homeCardSource, isDraft,
    isSameForm, soldPerTier, toPayload, todayKey,
} from './eventModel';

/*
 * Full-page editor for an event in Events. Writes the fields the app reads
 * (see eventModel.js); images upload as soon as they're picked or pasted.
 * Drafts are hidden everywhere until published.
 */

const SECTIONS = [
    { id: 'ev-basics', label: 'Basics' },
    { id: 'ev-entry', label: 'Tickets and guestlist' },
    { id: 'ev-images', label: 'Images' },
    { id: 'ev-shows', label: 'Where it shows' },
];

// Which field problem belongs to which section (to scroll there on save).
const SECTION_OF = { title: 'ev-basics', date: 'ev-basics', location: 'ev-basics', locationUrl: 'ev-basics', tiers: 'ev-entry', price: 'ev-entry', guestlist: 'ev-entry' };

const errCls = (on) => (on ? 'border-red-500/60 dark:border-red-500/60' : '');
const ErrorText = ({ children }) => (children ? <p role="alert" className="mt-1 text-[12px] font-semibold text-red-600 dark:text-red-400">{children}</p> : null);

/** Names as chips: type and press Enter or a comma. */
const ArtistInput = ({ value, onChange }) => {
    const [text, setText] = useState('');
    const add = (raw = text) => {
        const names = String(raw).split(',').map(s => s.trim()).filter(Boolean).filter(n => !value.some(v => v.toLowerCase() === n.toLowerCase()));
        if (names.length) onChange([...value, ...names]);
        setText('');
    };
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                    {value.map((name, i) => (
                        <span key={`${name}-${i}`} className="inline-flex h-9 items-center gap-1 rounded-xl bg-emerald-500/10 pl-3 pr-1 text-[13px] font-semibold text-emerald-800 dark:bg-neon-green/10 dark:text-neon-green">
                            {name}
                            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${name}`} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X size={13} /></button>
                        </span>
                    ))}
                </div>
            )}
            <input
                className={fieldCls}
                value={text}
                onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setText(e.target.value))}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); add(); }
                    if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
                }}
                onBlur={() => text.trim() && add()}
                placeholder={value.length ? 'Add another' : 'Type a name and press Enter'}
            />
        </div>
    );
};

/** A big on/off card for "Sell tickets" and "Guestlist". */
const AccessSwitch = ({ icon: Icon, label, hint, checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors',
            checked ? 'border-emerald-500/60 bg-neon-green/[0.07] dark:border-neon-green/50' : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}
    >
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', checked ? 'bg-emerald-500 text-white dark:bg-neon-green dark:text-black' : 'bg-black/5 text-gray-500 dark:bg-white/[0.06]')}><Icon size={18} /></span>
        <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">{label}</span>
            <span className="block text-[12px] text-gray-500">{hint}</span>
        </span>
        <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-emerald-500 dark:bg-neon-green' : 'bg-black/15 dark:bg-white/15')}>
            <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left]', checked ? 'left-[22px]' : 'left-0.5')} />
        </span>
    </button>
);

/** Where the event will be listed, from the current settings. */
const Placements = ({ form }) => {
    const rows = [
        { label: 'newbi.live home · Upcoming', on: form.showOnSite },
        { label: 'App home · Upcoming', on: form.showInApp },
        { label: 'App · Tickets tab', on: form.isTicketed },
        { label: 'App · Community tab', on: form.isGuestlistEnabled },
    ];
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="mb-2 text-[12px] font-bold text-gray-500">{form.draft ? 'After you publish, it shows in' : 'Shows in'}</p>
            <ul className="space-y-1.5">
                {rows.map(r => (
                    <li key={r.label} className={cn('flex items-center gap-2 text-[13px] font-semibold', !r.on && 'text-gray-400 dark:text-zinc-600')}>
                        {r.on ? <Check size={14} className="text-emerald-600 dark:text-neon-green" /> : <Minus size={14} />} {r.label}
                    </li>
                ))}
            </ul>
            {!form.date && <p className="mt-2 text-[12px] text-gray-500">Lists only show events with a date.</p>}
        </div>
    );
};

const EventEditor = ({ event, orders = [], categories = [], onDone }) => {
    const addToast = useStore(s => s.addToast);
    const navigate = useNavigate();
    const editing = Boolean(event?.id);
    const wasDraft = isDraft(event);
    const initial = useMemo(() => fromEvent(event), []); // eslint-disable-line react-hooks/exhaustive-deps
    const [form, setForm] = useState(initial);
    const [tried, setTried] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [notify, setNotify] = useState(true);
    const [announce, setAnnounce] = useState(false);
    const [confirm, confirmEl] = useConfirm();
    const savingRef = useRef(false);

    const dirty = !isSameForm(form, initial);
    useUnsavedWarning(dirty && !saving);

    const set = (patch) => setForm(prev => ({ ...prev, ...patch }));
    const poster = useImageField(form.image, (url) => set({ image: url }));
    const banner = useImageField(form.hubImage, (url) => set({ hubImage: url }));
    const layout = useImageField(form.venueLayout, (url) => set({ venueLayout: url }));
    const uploading = poster.uploading || banner.uploading || layout.uploading;

    const soldByTier = useMemo(() => (editing ? soldPerTier(computeAvailability(event, orders)) : {}), [editing, event, orders]);
    const ordersCount = useMemo(() => orders.filter(o => o.status !== 'rejected').length, [orders]);
    const problems = useMemo(() => eventProblems(form, { soldByTier }), [form, soldByTier]);
    const err = (key) => (tried ? problems[key] : null);
    const source = homeCardSource(event);

    const previewData = useMemo(() => ({ ...toPayload(form, event), id: event?.id || 'preview' }), [form, event]);
    // Ticket sales' map builder (venueMap) replaces the venue image with drawn boxes.
    const seatMap = Boolean(event?.venueMap?.elements?.length);

    const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const save = async (asDraft) => {
        // A published event can be hidden again with the "Hide it" switch.
        if (savingRef.current || uploading) return;
        const next = { ...form, draft: asDraft };
        const found = eventProblems(next, { soldByTier });
        setTried(true);
        const firstKey = Object.keys(found)[0];
        if (firstKey) {
            setForm(next);
            addToast(found[firstKey], 'warning');
            scrollTo(SECTION_OF[firstKey] || 'ev-basics');
            return;
        }
        if (!asDraft && next.date && next.date < todayKey() && !(await confirm({
            title: 'This date has passed',
            body: 'Past events don’t show in Upcoming and move to Work automatically. Save anyway?',
            confirmLabel: 'Save anyway',
            tone: 'accent',
        }))) return;
        if (editing && event.isGuestlistEnabled && !next.isGuestlistEnabled && !(await confirm({
            title: 'Turn off the guestlist?',
            body: 'People can’t sign up any more. Everyone already on the list keeps their spot, and you still see them in Guestlists.',
            confirmLabel: 'Turn off',
        }))) return;

        const publishing = !asDraft && (!editing || wasDraft);
        const payload = toPayload(next, event);
        savingRef.current = true;
        setSaving(true);
        const store = useStore.getState();
        try {
            let id = event?.id;
            if (editing) {
                await store.updateUpcomingEvent(id, payload);
            } else {
                id = await store.addUpcomingEvent({ ...payload, createdAt: new Date().toISOString() }, publishing && announce);
            }

            // The guestlist page reads capacity and the entry time from the guestlist doc first.
            if (payload.isGuestlistEnabled && id) {
                const glPatch = { maxSpots: payload.maxSpots, entryUntil: payload.entryUntil };
                if (asDraft) glPatch.status = 'draft';
                else if (wasDraft) glPatch.status = 'Open';
                await store.updateGuestlist(id, glPatch).catch(e => console.warn('Guestlist sync failed:', e));
                const before = Number(event?.maxSpots) || 0;
                if (editing && event?.isGuestlistEnabled && before > 0 && (payload.maxSpots === 0 || payload.maxSpots > before)) {
                    notifyEvent('guestlist-spot-freed', { guestlistId: id });
                }
            }

            // An announcement for a draft goes out when it's published.
            if (publishing && editing && announce) {
                await store.addAnnouncement({
                    title: payload.title,
                    content: payload.description || `Join us on ${formatWhen(payload)}${payload.location ? ` at ${payload.location}` : ''}.`,
                    date: payload.date.slice(0, 10) || todayKey(),
                    image: payload.image || payload.hubImage || '',
                    isPinned: false,
                    linkedEventId: id,
                }).catch(e => { console.warn(e); addToast("We couldn't post the announcement.", 'warning', { title: 'Event published' }); });
            }

            // The event is saved; a failed notification must not look like a failed save.
            if (publishing && notify && id) {
                notifyAllUsers(
                    `New event: ${payload.title}`,
                    `${formatWhen(payload, { year: false })}${payload.location ? ` at ${payload.location}` : ''}.`,
                    appPathFor(payload, id),
                    payload.image || payload.hubImage || '',
                ).catch(e => {
                    console.warn('Event notification failed:', e);
                    addToast('Use “Notify everyone” in the event’s menu to try again.', 'warning', { title: 'Saved, but the notification didn’t go out' });
                });
            }

            const doneMsg = asDraft ? 'Draft saved. It stays hidden until you publish.' : publishing ? 'Event published.' : 'Event saved.';
            {
                addToast(doneMsg, 'success');
            }
            savingRef.current = false;
            onDone(true, id, { draft: asDraft });
        } catch (e) {
            console.error(e);
            addToast('Check your connection and try again.', 'error', {
                title: 'Event not saved',
                action: { label: 'Try again', onClick: () => save(asDraft) },
            });
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    const leave = async () => {
        if (dirty && !(await confirm({ title: 'Leave without saving?', body: 'Your changes to this event will be lost.', confirmLabel: 'Leave', cancelLabel: 'Keep editing' }))) return;
        onDone(false);
    };

    const offerDraft = !editing || wasDraft;
    const primaryLabel = saving ? 'Saving…' : uploading ? 'Uploading…' : offerDraft ? 'Publish' : 'Save changes';
    const title = form.title || (editing ? 'Edit event' : 'New event');

    return (
        <div className="pb-28 sm:pb-10">
            <EditorBar backLabel="Events" onBack={leave} title={title}>
                {editing && <span className={cn('hidden rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline', wasDraft ? 'bg-black/5 text-gray-600 dark:bg-white/10 dark:text-zinc-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-neon-green')}>{wasDraft ? 'Draft' : 'Live'}</span>}
                <Button variant="secondary" onClick={() => setShowPreview(v => !v)} className="h-10 xl:hidden">
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />} {showPreview ? 'Edit' : 'Preview'}
                </Button>
                {offerDraft && <Button variant="secondary" onClick={() => save(true)} disabled={saving || uploading} className="hidden h-10 sm:inline-flex">Save draft</Button>}
                <Button variant="primary" onClick={() => save(offerDraft ? false : form.draft)} disabled={saving || uploading} className="hidden h-10 sm:inline-flex">{primaryLabel}</Button>
            </EditorBar>

            {source && (
                <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/[0.06] p-4 sm:flex-row sm:items-center">
                    <p className="min-w-0 flex-1 text-[13px] font-semibold text-sky-900 dark:text-sky-200">This is the home page card for a {source.label.toLowerCase()}. Sign-ups and details are managed there; changes here only change the card.</p>
                    <Button as={Link} to={source.to} variant="secondary" className="h-10 shrink-0">Open the {source.label.toLowerCase()}</Button>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form id="event-editor" onSubmit={(e) => { e.preventDefault(); save(offerDraft ? false : form.draft); }} noValidate className={cn('space-y-5', showPreview && 'hidden xl:block')}>
                    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" aria-label="Sections">
                        {SECTIONS.map(s => (
                            <button key={s.id} type="button" onClick={() => scrollTo(s.id)} className="h-9 shrink-0 rounded-full border border-black/10 bg-white px-3.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:text-white">{s.label}</button>
                        ))}
                    </nav>

                    <BuilderCard id="ev-basics" title="Basics" hint="What, when and where">
                        <div className="space-y-3">
                            <Field label="Event name">
                                <input className={cn(fieldCls, errCls(err('title')))} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Sunburn Arena ft. Alan Walker" />
                                <ErrorText>{err('title')}</ErrorText>
                            </Field>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <Field label="Date" className="col-span-2 sm:col-span-1">
                                    <input className={cn(fieldCls, errCls(err('date')))} type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                                </Field>
                                <Field label="Starts at" optional>
                                    <input className={fieldCls} type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} />
                                </Field>
                                <Field label="Doors open" optional>
                                    <input className={fieldCls} value={form.doorsOpen} onChange={(e) => set({ doorsOpen: e.target.value })} placeholder="6:30 pm" maxLength={40} />
                                </Field>
                            </div>
                            <ErrorText>{err('date')}</ErrorText>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Venue">
                                    <input className={cn(fieldCls, errCls(err('location')))} value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Jayamahal Palace" />
                                    <ErrorText>{err('location')}</ErrorText>
                                </Field>
                                <Field label="City" optional hint="On the card; Community filters by it">
                                    <CityInput className={fieldCls} value={form.city} onChange={(v) => set({ city: v })} />
                                </Field>
                            </div>
                            <Field label="Google Maps link" optional hint="“Directions” on the guestlist page and passes">
                                <input className={cn(fieldCls, errCls(err('locationUrl')))} inputMode="url" autoCapitalize="off" value={form.locationUrl} onChange={(e) => set({ locationUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
                                <ErrorText>{err('locationUrl')}</ErrorText>
                            </Field>
                            <Field label="Category" optional hint="The small label on the card; also where it goes in Work afterwards">
                                <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={form.category} onChange={(e) => set({ category: e.target.value })}>
                                    <option value="">No category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    {form.category && !categories.some(c => c.id === form.category) && <option value={form.category}>{form.category}</option>}
                                </ThemedSelect>
                            </Field>
                            {/* Not a <label>: a tap on it would press the first chip's remove button. */}
                            <div>
                                <p className="mb-1 text-[12px] font-bold text-gray-500">Line-up <span className="font-medium">(optional)</span></p>
                                <ArtistInput value={form.artists} onChange={(v) => set({ artists: v })} />
                                <p className="mt-1 text-[11px] text-gray-500">{Array.isArray(event?.lineup) && event.lineup.length ? 'The event page shows the line-up (with photos) set in Ticket sales; these names are used for link previews.' : 'Shown on the guestlist page and link previews'}</p>
                            </div>
                            <Field label="About" optional>
                                <textarea className={areaCls} rows={5} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="What’s happening, who’s playing, dress code, age limit, entry rules…" />
                            </Field>
                        </div>
                    </BuilderCard>

                    <BuilderCard id="ev-entry" title="Tickets and guestlist" hint="How people get in. Leave both off for an event that’s only listed.">
                        {source ? (
                            <p className="text-[13px] text-gray-600 dark:text-zinc-300">Sign-ups for this card happen on the {source.label.toLowerCase()} itself. <Link to={source.to} className="font-semibold underline underline-offset-2">Open the {source.label.toLowerCase()}</Link> to change them.</p>
                        ) : (<>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <AccessSwitch icon={Ticket} label="Sell tickets" hint="Paid or free, with QR passes" checked={form.isTicketed} onChange={(v) => set({ isTicketed: v })} />
                            <AccessSwitch icon={Users} label="Guestlist" hint="People sign up for a spot or RSVP" checked={form.isGuestlistEnabled} onChange={(v) => set({ isGuestlistEnabled: v })} />
                        </div>

                        {form.isTicketed && (
                            <div className="mt-5 space-y-4 border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[14px] font-bold">Tickets</p>
                                    {editing && ordersCount > 0 && (
                                        <Link to={`/admin/ticketing?eventId=${encodeURIComponent(event.id)}`} className="inline-flex h-9 items-center gap-1.5 text-[13px] font-semibold text-emerald-700 dark:text-neon-green">{ordersCount} {ordersCount === 1 ? 'order' : 'orders'} <ExternalLink size={13} /></Link>
                                    )}
                                </div>
                                {form.tiers.length === 0 && (
                                    <Field label="Price (₹)" hint="One price for everyone. 0 makes it free.">
                                        <input className={cn(fieldCls, 'max-w-[12rem]', errCls(err('price')))} type="number" inputMode="decimal" min="0" placeholder="0" value={form.basePrice} onChange={(e) => set({ basePrice: e.target.value })} />
                                        <ErrorText>{err('price')}</ErrorText>
                                    </Field>
                                )}
                                <TicketTiers tiers={form.tiers} onChange={(tiers) => set({ tiers })} soldByTier={soldByTier} layoutUrl={seatMap ? '' : form.venueLayout} error={err('tiers')} />
                                {form.tiers.length > 0 && !form.venueLayout && !seatMap && <p className="text-[12px] text-gray-500">Add a venue map under Images to show where each ticket type sits.</p>}
                                {editing && (
                                    <p className="text-[12px] text-gray-500">
                                        {seatMap ? 'This event has a seat map from Ticket sales; checkout shows that. ' : ''}
                                        Sale dates, per-order limits, payment details and the <Link to={`/admin/ticketing?eventId=${encodeURIComponent(event.id)}&edit=map`} className="font-semibold underline underline-offset-2">seat map</Link> are in <Link to={`/admin/ticketing?eventId=${encodeURIComponent(event.id)}&tab=settings`} className="font-semibold underline underline-offset-2">Ticket sales</Link>.
                                    </p>
                                )}
                                <Field label="Total tickets" optional hint="Across all types. Blank means no overall limit.">
                                    <input className={cn(fieldCls, 'max-w-[12rem]')} type="number" inputMode="numeric" min="0" placeholder="No limit" value={form.ticketCapacity} onChange={(e) => set({ ticketCapacity: e.target.value })} />
                                </Field>
                                <Field label="Note at checkout" optional>
                                    <textarea className={areaCls} rows={2} value={form.ticketingDescription} onChange={(e) => set({ ticketingDescription: e.target.value })} placeholder="e.g. Prices go up on 1 Nov. Kids under 5 enter free." />
                                </Field>
                                <Field label="Rules" optional>
                                    <textarea className={areaCls} rows={2} value={form.ticketingRules} onChange={(e) => set({ ticketingRules: e.target.value })} placeholder="ID required, no outside food, no refunds…" />
                                </Field>
                            </div>
                        )}

                        {form.isGuestlistEnabled && (
                            <div className="mt-5 space-y-4 border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
                                <p className="text-[14px] font-bold">Guestlist</p>
                                <Choice value={form.guestlistMode} onChange={(v) => set({ guestlistMode: v })} options={[
                                    { value: 'qr', label: 'QR passes', hint: 'Each guest gets a pass to scan' },
                                    { value: 'rsvp', label: 'RSVP only', hint: 'A headcount, no pass' },
                                ]} />
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    <Field label="Capacity" optional hint="Then people join a waitlist">
                                        <input className={fieldCls} type="number" inputMode="numeric" min="0" placeholder="No limit" value={form.maxSpots} onChange={(e) => set({ maxSpots: e.target.value })} />
                                    </Field>
                                    <Field label="Spots per person" hint="Above 1 asks for +1 names">
                                        <input className={cn(fieldCls, errCls(err('guestlist')))} type="number" inputMode="numeric" min="1" value={form.perUserLimit} onChange={(e) => set({ perUserLimit: e.target.value })} />
                                    </Field>
                                    <Field label="Entry until" optional hint="Guests are reminded on the day" className="col-span-2 sm:col-span-1">
                                        <input className={fieldCls} value={form.entryUntil} maxLength={40} placeholder="11:00 pm" onChange={(e) => set({ entryUntil: e.target.value })} />
                                    </Field>
                                </div>
                                <ErrorText>{err('guestlist')}</ErrorText>
                                <GuestlistTaskConfig
                                    enabled={form.hasGuestlistTask}
                                    taskData={form.guestlistTask}
                                    onChange={({ hasGuestlistTask, guestlistTask }) => set({ hasGuestlistTask, guestlistTask })}
                                    accentColor="neon-pink"
                                />
                            </div>
                        )}
                        </>)}
                    </BuilderCard>

                    <BuilderCard id="ev-images" title="Images" hint="Upload, paste (Ctrl/Cmd+V) or use a link">
                        <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                            <ImageSlot label={poster.uploading ? 'Poster · uploading…' : 'Poster (4:5)'} hint="Event cards and the Tickets tab" {...poster.slotProps} />
                            <div className="space-y-5">
                                <ImageSlot label={banner.uploading ? 'Banner · uploading…' : 'Banner (16:9)'} hint="Community cards and the guestlist page. Optional: the poster is used if empty" aspect="aspect-video" {...banner.slotProps} />
                                <ImageSlot label={layout.uploading ? 'Venue map · uploading…' : 'Venue map'} hint="Optional. Shown at checkout; ticket types can be marked on it" aspect="aspect-[16/10]" contain {...layout.slotProps} />
                            </div>
                        </div>
                        <AmbientColorField className="mt-5" image={form.hubImage || form.image} value={form.ambientColor} onChange={(v) => set({ ambientColor: v })} />
                    </BuilderCard>

                    <BuilderCard id="ev-shows" title="Where it shows" hint="Its own page always works from a link">
                        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                            <div className="pb-3">
                                <Toggle label={<span className="inline-flex items-center gap-2"><Globe size={15} className="text-gray-400" /> newbi.live home · Upcoming</span>} hint="The Upcoming section on the website’s home page" checked={form.showOnSite} onChange={(v) => set({ showOnSite: v })} />
                            </div>
                            <div className="py-3">
                                <Toggle label={<span className="inline-flex items-center gap-2"><Smartphone size={15} className="text-gray-400" /> App home · Upcoming</span>} hint="The Upcoming rail on the app’s Home" checked={form.showInApp} onChange={(v) => set({ showInApp: v })} />
                            </div>
                            <div className="py-3">
                                <Toggle label="Pin to the top" hint="Shown first in lists" checked={form.isPinned} onChange={(v) => set({ isPinned: v })} />
                            </div>
                            {editing && !wasDraft && (
                                <div className="pt-3">
                                    <Toggle label="Hide it (back to draft)" hint="Takes it off the website and the app until you publish again" checked={form.draft} onChange={(v) => set({ draft: v })} />
                                </div>
                            )}
                        </div>
                        <p className="mt-3 text-[12px] text-gray-500">Ticket sales are always in the app’s Tickets tab and guestlists in its Community tab.</p>
                    </BuilderCard>

                    {offerDraft && (
                        <BuilderCard title="When you publish">
                            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                                <div className="pb-3"><Toggle label="Notify everyone" hint="An in-app and push notification about the new event" checked={notify} onChange={setNotify} /></div>
                                <div className="pt-3"><Toggle label="Post to Announcements" hint="Adds it to the announcements feed" checked={announce} onChange={setAnnounce} /></div>
                            </div>
                        </BuilderCard>
                    )}
                </form>

                <aside className={cn('mx-auto w-full max-w-sm space-y-3 xl:sticky xl:top-24 xl:max-w-none xl:self-start', !showPreview && 'hidden xl:block')}>
                    <p className="text-[12px] font-bold text-gray-500">Live preview</p>
                    <LivePreview type="event" data={previewData} />
                    <Placements form={form} />
                </aside>
            </div>

            <PhoneBar>
                {offerDraft
                    ? <Button variant="secondary" onClick={() => save(true)} disabled={saving || uploading} className="h-12">Draft</Button>
                    : <Button variant="ghost" onClick={leave} className="h-12">Cancel</Button>}
                <Button variant="primary" onClick={() => save(offerDraft ? false : form.draft)} disabled={saving || uploading} className="h-12 flex-1">{primaryLabel}</Button>
            </PhoneBar>
            {confirmEl}
        </div>
    );
};

export default EventEditor;
