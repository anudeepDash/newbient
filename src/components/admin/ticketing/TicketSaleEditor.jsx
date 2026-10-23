import React, { useEffect, useMemo, useRef, useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Upload from 'lucide-react/dist/esm/icons/upload';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Sheet from '../Sheet';
import ThemedSelect from '../ThemedSelect';
import { Button, Badge } from '../ui';
import { Field, Toggle, fieldCls, areaCls } from '../uploads/UploadKit';
import { ImageSlot } from '../events/EditorParts';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import { callTicketApi } from '../../../lib/ticketApi';
import { computeAvailability } from '../../../lib/ticketing';
import { tierColor } from '../../../lib/venueMap';
import { APP_ORIGIN } from '../../../app/host';
import VenueMapBuilder from './VenueMapBuilder';
import {
    AGE_LIMITS, SEATING, TIER_BADGES, VENUE_TYPES, EMPTY_SALE, blankTier, fromEvent, newRowId, saleProblems, toPayload, usesSiteUpi,
} from './saleModel';

/*
 * Create or edit a ticket sale: everything the app's event page and checkout
 * show, the way BookMyShow and District lay out a show. The show, date and
 * time, the venue, the line-up, "good to know", ticket types (with sale
 * windows, per-order limits, couple passes, early-bird prices), the venue
 * map, how buyers pay, FAQs and terms, and where it's listed.
 *
 * It edits any ticketed event (made here or in Events). Saving writes only
 * the fields in saleModel.js, so guestlist settings and the Events editor's
 * own fields stay as they are.
 */

const SECTIONS = [
    ['show', 'The show'],
    ['when', 'Date and time'],
    ['where', 'Venue'],
    ['lineup', 'Line-up'],
    ['know', 'Good to know'],
    ['tickets', 'Tickets'],
    ['map', 'Venue map'],
    ['payments', 'Payments'],
    ['faqs', 'FAQs and terms'],
    ['listing', 'Where it shows'],
];

const Card = ({ id, title, hint, action, children }) => (
    <section id={`sale-${id}`} data-section={id} className="scroll-mt-4 rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold tracking-tight">{title}</h3>
                {hint && <p className="mt-0.5 text-[12.5px] text-gray-500">{hint}</p>}
            </div>
            {action}
        </div>
        <div className="space-y-4">{children}</div>
    </section>
);

const IconButton = ({ label, onClick, disabled, children, danger }) => (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
        className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors disabled:opacity-25',
            danger ? 'hover:bg-red-500/10 hover:text-red-500' : 'hover:bg-black/5 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-zinc-200')}>
        {children}
    </button>
);

const Select = ({ value, onChange, options }) => (
    <ThemedSelect className={fieldCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(o => (typeof o === 'string'
            ? <option key={o} value={o}>{o || 'Not set'}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>))}
    </ThemedSelect>
);

/* One ticket type: the basics up front, the rest behind "More options". */
const TierCard = ({ tier, index, count, sold, onChange, onMove, onRemove }) => {
    const [more, setMore] = useState(Boolean(tier.maxPerOrder || tier.minPerOrder || (tier.admits && tier.admits !== '1') || tier.salesStart || tier.salesEnd || tier.hidden || tier.color));
    const set = (patch) => onChange({ ...tier, ...patch });
    const color = tierColor(tier, index);
    return (
        <div className={cn('rounded-2xl border p-3 sm:p-4', tier.hidden ? 'border-dashed border-black/15 opacity-75 dark:border-white/15' : 'border-black/[0.08] dark:border-white/[0.1]')}>
            <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                <p className="min-w-0 flex-1 truncate text-[14px] font-bold">{tier.name || `Ticket type ${index + 1}`}</p>
                {tier.hidden && <Badge tone="gray"><EyeOff size={10} /> Hidden</Badge>}
                {sold > 0 && <Badge tone="green">{sold} sold</Badge>}
                <IconButton label="Move up" onClick={() => onMove(-1)} disabled={index === 0}><ArrowUp size={15} /></IconButton>
                <IconButton label="Move down" onClick={() => onMove(1)} disabled={index === count - 1}><ArrowDown size={15} /></IconButton>
                <IconButton label={sold ? 'Has sales, hide it instead' : 'Remove ticket type'} onClick={onRemove} disabled={count === 1 || sold > 0} danger><Trash2 size={15} /></IconButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Field label="Name">
                    <input className={fieldCls} value={tier.name} onChange={(e) => set({ name: e.target.value })} placeholder="Early bird · GA · VIP · Fan pit" />
                </Field>
                <Field label="Price (₹)" hint="0 for free">
                    <input className={fieldCls} type="number" inputMode="decimal" min="0" value={tier.price} onChange={(e) => set({ price: e.target.value })} placeholder="0" />
                </Field>
                <Field label="How many" hint={sold ? `${sold} sold so far` : 'Blank: no limit'}>
                    <input className={fieldCls} type="number" inputMode="numeric" min={sold || 0} value={tier.capacity} onChange={(e) => set({ capacity: e.target.value })} placeholder="No limit" />
                </Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Field label="What's included" optional>
                    <input className={fieldCls} value={tier.description} maxLength={300} onChange={(e) => set({ description: e.target.value })} placeholder="Entry + 1 drink · Access to the front pit" />
                </Field>
                <Field label="Was (₹)" optional hint="Shown struck through">
                    <input className={fieldCls} type="number" inputMode="decimal" min="0" value={tier.originalPrice} onChange={(e) => set({ originalPrice: e.target.value })} placeholder="—" />
                </Field>
                <Field label="Tag" optional>
                    <Select value={tier.badge} onChange={(v) => set({ badge: v })} options={TIER_BADGES.map(b => ({ value: b, label: b || 'None' }))} />
                </Field>
            </div>
            <button type="button" onClick={() => setMore(v => !v)} className="mt-3 flex h-10 items-center gap-1 text-[13px] font-bold text-gray-600 dark:text-zinc-300">
                More options <ChevronDown size={15} className={cn('transition-transform', more && 'rotate-180')} />
            </button>
            {more && (
                <div className="mt-2 space-y-3 rounded-xl bg-black/[0.02] p-3 dark:bg-white/[0.02]">
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Max per order" hint="Blank: up to 10">
                            <input className={fieldCls} type="number" inputMode="numeric" min="1" max="20" value={tier.maxPerOrder} onChange={(e) => set({ maxPerOrder: e.target.value })} placeholder="10" />
                        </Field>
                        <Field label="Min per order" hint="Group passes">
                            <input className={fieldCls} type="number" inputMode="numeric" min="1" value={tier.minPerOrder} onChange={(e) => set({ minPerOrder: e.target.value })} placeholder="1" />
                        </Field>
                        <Field label="People per ticket" hint="2 for a couple pass">
                            <input className={fieldCls} type="number" inputMode="numeric" min="1" max="20" value={tier.admits} onChange={(e) => set({ admits: e.target.value })} placeholder="1" />
                        </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Sale starts" optional hint="India time">
                            <input className={fieldCls} type="datetime-local" value={tier.salesStart} onChange={(e) => set({ salesStart: e.target.value })} />
                        </Field>
                        <Field label="Sale ends" optional hint="e.g. when early bird closes">
                            <input className={fieldCls} type="datetime-local" value={tier.salesEnd} onChange={(e) => set({ salesEnd: e.target.value })} />
                        </Field>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-[13px] font-semibold">
                            <input type="color" value={/^#[0-9a-f]{6}$/i.test(tier.color) ? tier.color : color} onChange={(e) => set({ color: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent dark:border-white/10" />
                            Colour on the map
                        </label>
                        <div className="min-w-[220px] flex-1">
                            <Toggle label="Hide this ticket type" hint="Not shown or sold; sold tickets stay valid" checked={tier.hidden} onChange={(v) => set({ hidden: v })} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ArtistRow = ({ artist, onChange, onRemove, onUpload, uploading }) => (
    <div className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
        <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-black/5 text-gray-400 dark:bg-white/5" aria-label="Photo">
            {artist.image ? <img src={artist.image} alt="" className="h-full w-full object-cover" /> : <Upload size={16} />}
            {uploading && <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-bold text-white">…</span>}
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f); }} />
        </label>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            <input className={fieldCls} value={artist.name} onChange={(e) => onChange({ ...artist, name: e.target.value })} placeholder="Name" aria-label="Name" />
            <input className={fieldCls} value={artist.role} onChange={(e) => onChange({ ...artist, role: e.target.value })} placeholder="DJ · Headliner · Host" aria-label="Role" />
            <input className={fieldCls} value={artist.instagram} onChange={(e) => onChange({ ...artist, instagram: e.target.value })} placeholder="@instagram" aria-label="Instagram" autoCapitalize="off" autoCorrect="off" />
        </div>
        <IconButton label="Remove" onClick={onRemove} danger><Trash2 size={15} /></IconButton>
    </div>
);

const TicketSaleEditor = ({ open, onClose, event, onSaved, initialSection }) => {
    const addToast = useStore(s => s.addToast);
    const ticketOrders = useStore(s => s.ticketOrders);
    // The raw event document (the Ticketing list hands over a merged view).
    const raw = useStore(s => (event?.id ? s.upcomingEvents.find(e => e.id === event.id) : null)) || event;
    const [form, setForm] = useState(EMPTY_SALE);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState('');
    const [showProblems, setShowProblems] = useState(false);
    const [gatewayReady, setGatewayReady] = useState(null);
    const [active, setActive] = useState('show');
    const bodyRef = useRef(null);
    const savingRef = useRef(false);
    const editing = Boolean(event?.id);

    useEffect(() => {
        if (!open) return;
        setForm(raw ? fromEvent(raw) : EMPTY_SALE());
        setShowProblems(false);
        setActive(initialSection || 'show');
        callTicketApi('ticket-config', {}).then(res => setGatewayReady(res.ok ? Boolean(res.data.gatewayReady) : null));
        if (initialSection) setTimeout(() => jump(initialSection), 350);
    }, [open, event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const soldByTier = useMemo(() => {
        if (!editing) return {};
        const orders = (ticketOrders || []).filter(o => o.eventId === event.id);
        const av = computeAvailability(raw, orders);
        return Object.fromEntries(Object.entries(av.tiers).map(([id, t]) => [id, t.held || 0]));
    }, [editing, ticketOrders, raw, event?.id]);

    const set = (patch) => setForm(f => ({ ...f, ...patch }));
    const setInfo = (patch) => setForm(f => ({ ...f, info: { ...f.info, ...patch } }));
    const setList = (key, fn) => setForm(f => ({ ...f, [key]: fn(f[key]) }));

    const problems = saleProblems(form, { soldByTier });
    if (form.payments.gateway && !form.payments.upi && gatewayReady === false && form.tiers.some(t => Number(t.price) > 0)) {
        problems.push({ section: 'payments', message: 'Razorpay isn’t set up yet, so keep UPI on or buyers can’t pay.' });
    }
    const problemsBy = problems.reduce((m, p) => ({ ...m, [p.section]: (m[p.section] || 0) + 1 }), {});

    const jump = (id) => {
        setActive(id);
        const el = bodyRef.current?.querySelector(`[data-section="${id}"]`) || document.getElementById(`sale-${id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Which section is on screen, for the side menu.
    useEffect(() => {
        if (!open) return undefined;
        const root = document.getElementById('sale-show')?.closest('.overflow-y-auto');
        if (!root) return undefined;
        const io = new IntersectionObserver((entries) => {
            const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (top) setActive(top.target.dataset.section);
        }, { root, rootMargin: '0px 0px -70% 0px' });
        root.querySelectorAll('[data-section]').forEach(el => io.observe(el));
        return () => io.disconnect();
    }, [open, form.tiers.length]);

    const upload = async (file, key, apply) => {
        if (!file?.type?.startsWith('image/')) { addToast('Pick an image file, like a JPG or PNG.', 'warning'); return; }
        setUploading(key);
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            if (!url) throw new Error('No URL');
            apply(url);
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Image not uploaded' });
        } finally {
            setUploading('');
        }
    };
    const pasteInto = (key, apply) => (e) => {
        const item = Array.from(e.clipboardData?.items || []).find(i => i.kind === 'file' && i.type.startsWith('image/'));
        if (!item) return;
        e.preventDefault();
        upload(item.getAsFile(), key, apply);
    };

    const save = async (e) => {
        e?.preventDefault();
        if (savingRef.current) return;
        if (problems.length) { setShowProblems(true); jump(problems[0].section); return; }
        const data = toPayload(form);
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
            addToast(editing ? 'Ticket sale saved.' : 'It’s live in the app’s Tickets tab.', 'success', editing ? undefined : { title: 'Ticket sale created' });
            onSaved?.(id, { created: !editing });
            onClose();
        } catch (err) {
            console.error(err);
            addToast("Check your connection and try again.", 'error', { title: "Couldn't save the ticket sale" });
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    const moveTier = (i, d) => setList('tiers', list => {
        const next = [...list];
        const j = i + d;
        if (j < 0 || j >= next.length) return list;
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });

    const paidTiers = form.tiers.some(t => Number(t.price) > 0);
    const previewUrl = editing ? `${APP_ORIGIN}/tickets/${encodeURIComponent(event.id)}` : null;

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            size="full"
            title={editing ? `Edit ${form.title || 'ticket sale'}` : 'New ticket sale'}
            subtitle="Everything buyers see on the event page and at checkout"
            bodyClassName="px-0 py-0"
            footer={(
                <div className="space-y-2">
                    {showProblems && problems.length > 0 && (
                        <button type="button" onClick={() => jump(problems[0].section)} className="flex w-full items-start gap-2 rounded-xl bg-red-500/[0.07] px-3 py-2 text-left text-[13px] font-semibold text-red-700 dark:text-red-300">
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                            <span>{problems[0].message}{problems.length > 1 ? ` (+${problems.length - 1} more)` : ''}</span>
                        </button>
                    )}
                    <div className="flex gap-2">
                        {previewUrl && <Button as="a" href={previewUrl} target="_blank" rel="noopener noreferrer" variant="ghost" className="hidden h-12 sm:inline-flex"><ExternalLink size={14} /> View page</Button>}
                        <Button variant="secondary" className="h-12 sm:ml-auto" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button variant="accent" type="submit" form="ticket-sale-editor" className="h-12 flex-1 sm:flex-none sm:px-8" disabled={saving || Boolean(uploading)}>
                            {saving ? 'Saving…' : uploading ? 'Uploading…' : editing ? 'Save changes' : 'Create ticket sale'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <div ref={bodyRef} className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)]">
                {/* Section menu: a chip row on phones, a side list on desktop. */}
                <nav aria-label="Sections" className="sticky top-0 z-10 border-b border-black/[0.06] bg-white/95 backdrop-blur dark:border-white/[0.06] dark:bg-[#0d0f15]/95 lg:h-fit lg:border-b-0 lg:bg-transparent lg:p-4 lg:backdrop-blur-none">
                    <ul className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:flex-col lg:px-0 lg:py-0 [&::-webkit-scrollbar]:hidden">
                        {SECTIONS.map(([id, label]) => (
                            <li key={id} className="shrink-0">
                                <button type="button" onClick={() => jump(id)}
                                    className={cn('flex h-10 w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 text-left text-[13px] font-bold transition-colors',
                                        active === id ? 'bg-emerald-500/10 text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green' : 'text-gray-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]')}>
                                    {label}
                                    {showProblems && problemsBy[id] > 0 && <span className="ml-auto h-2 w-2 rounded-full bg-red-500" aria-label="Needs a fix" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <form id="ticket-sale-editor" onSubmit={save} noValidate className="space-y-4 px-4 py-4 sm:px-5 lg:pl-0 lg:pr-6">
                    <Card id="show" title="The show" hint="The name, banner and what it's about">
                        <Field label="Name">
                            <input className={cn(fieldCls, 'text-[17px] font-bold')} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Halloween House Party · Bengaluru" />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Kind of event" optional>
                                <input className={fieldCls} value={form.category} onChange={(e) => set({ category: e.target.value })} placeholder="House party · Concert · Comedy" list="sale-kinds" />
                                <datalist id="sale-kinds">{['Concert', 'House party', 'Club night', 'Comedy', 'Festival', 'Workshop', 'Open mic', 'Meetup'].map(k => <option key={k} value={k} />)}</datalist>
                            </Field>
                            <Field label="Genres or tags" optional hint="Comma separated">
                                <input className={fieldCls} value={form.genres} onChange={(e) => set({ genres: e.target.value })} placeholder="Techno, House, Bollywood" />
                            </Field>
                        </div>
                        <div className="max-w-md">
                            <ImageSlot
                                label={uploading === 'image' ? 'Banner · uploading…' : 'Banner'}
                                hint="16:9 · paste works"
                                aspect="aspect-video"
                                previewUrl={form.image} url={form.image}
                                onFile={(f) => upload(f, 'image', (url) => set({ image: url }))}
                                onUrl={(v) => set({ image: v })} onClear={() => set({ image: '' })}
                                onPaste={pasteInto('image', (url) => set({ image: url }))}
                            />
                        </div>
                        <Field label="About the event" optional>
                            <textarea className={cn(areaCls, 'min-h-[140px]')} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="What's the night about, the vibe, the music…" />
                        </Field>
                        <Field label="Presented by" optional>
                            <input className={fieldCls} value={form.organizer} onChange={(e) => set({ organizer: e.target.value })} placeholder="Newbi Entertainment" />
                        </Field>
                    </Card>

                    <Card id="when" title="Date and time" hint="India time">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Field label="Date" className="col-span-2 sm:col-span-1">
                                <input className={fieldCls} type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                            </Field>
                            <Field label="Gates open" optional>
                                <input className={fieldCls} type="time" value={form.doorsOpen} onChange={(e) => set({ doorsOpen: e.target.value })} />
                            </Field>
                            <Field label="Starts" optional>
                                <input className={fieldCls} type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} />
                            </Field>
                            <Field label="Ends" optional>
                                <input className={fieldCls} type="time" value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} />
                            </Field>
                        </div>
                    </Card>

                    <Card id="where" title="Venue">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Venue name">
                                <input className={fieldCls} value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Phoenix Arena (or TBA)" />
                            </Field>
                            <Field label="City" optional>
                                <input className={fieldCls} value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="Bengaluru" />
                            </Field>
                        </div>
                        <Field label="Address" optional>
                            <input className={fieldCls} value={form.venueAddress} onChange={(e) => set({ venueAddress: e.target.value })} placeholder="12, 100 Feet Rd, Indiranagar" />
                        </Field>
                        <Field label="Google Maps link" optional hint="Buyers get a Directions button">
                            <input className={fieldCls} type="url" inputMode="url" autoCapitalize="off" value={form.locationUrl} onChange={(e) => set({ locationUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
                        </Field>
                    </Card>

                    <Card id="lineup" title="Line-up" hint="Artists, DJs and hosts, with a photo"
                        action={<Button variant="secondary" size="sm" className="h-10" onClick={() => setList('lineup', l => [...l, { id: newRowId('artist'), name: '', role: '', image: '', instagram: '' }])}><Plus size={14} /> Add</Button>}>
                        {form.lineup.length === 0 ? (
                            <p className="text-[13px] text-gray-500">No one added. The line-up section is hidden until you add someone.</p>
                        ) : form.lineup.map((a, i) => (
                            <ArtistRow key={a.id} artist={a}
                                uploading={uploading === `artist-${a.id}`}
                                onChange={(next) => setList('lineup', l => l.map((x, j) => (j === i ? next : x)))}
                                onRemove={() => setList('lineup', l => l.filter((_, j) => j !== i))}
                                onUpload={(f) => upload(f, `artist-${a.id}`, (url) => setList('lineup', l => l.map(x => (x.id === a.id ? { ...x, image: url } : x))))} />
                        ))}
                    </Card>

                    <Card id="know" title="Good to know" hint="Shown as quick facts on the page. Anything left blank isn't shown.">
                        <Toggle label="Show quick facts on the page" hint="Age, duration, gates open, seating, language and the rest. Off: the page skips them." checked={form.info.showFacts} onChange={(v) => setInfo({ showFacts: v })} />
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Field label="Age limit"><Select value={form.info.ageLimit} onChange={(v) => setInfo({ ageLimit: v })} options={AGE_LIMITS} /></Field>
                            <Field label="Seating"><Select value={form.info.seating} onChange={(v) => setInfo({ seating: v })} options={SEATING} /></Field>
                            <Field label="Venue type"><Select value={form.info.venueType} onChange={(v) => setInfo({ venueType: v })} options={VENUE_TYPES} /></Field>
                            <Field label="Language" optional>
                                <input className={fieldCls} value={form.info.languages} onChange={(e) => setInfo({ languages: e.target.value })} placeholder="Hindi, English" />
                            </Field>
                        </div>
                        <Field label="Dress code" optional>
                            <input className={fieldCls} value={form.info.dressCode} onChange={(e) => setInfo({ dressCode: e.target.value })} placeholder="Costumes encouraged" />
                        </Field>
                        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                            <Toggle label="Kid friendly" checked={form.info.kidFriendly} onChange={(v) => setInfo({ kidFriendly: v })} />
                            <Toggle label="Pet friendly" checked={form.info.petFriendly} onChange={(v) => setInfo({ petFriendly: v })} />
                            <Toggle label="Wheelchair accessible" checked={form.info.accessible} onChange={(v) => setInfo({ accessible: v })} />
                            <Toggle label="Parking available" checked={form.info.parking} onChange={(v) => setInfo({ parking: v })} />
                        </div>
                        <Field label="Things to know" optional hint="One per line, e.g. “Carry a valid ID”, “No re-entry”">
                            <textarea className={cn(areaCls, 'min-h-[110px]')} value={form.thingsToKnow} onChange={(e) => set({ thingsToKnow: e.target.value })} placeholder={'Carry a valid photo ID\nNo outside food or drinks\nNo re-entry'} />
                        </Field>
                    </Card>

                    <Card id="tickets" title="Tickets" hint="One card per ticket type. Buyers see them in this order."
                        action={<Button variant="secondary" size="sm" className="h-10" onClick={() => setList('tiers', l => [...l, blankTier()])}><Plus size={14} /> Add type</Button>}>
                        <div className="space-y-3">
                            {form.tiers.map((t, i) => (
                                <TierCard key={t.id} tier={t} index={i} count={form.tiers.length} sold={soldByTier[t.id] || 0}
                                    onChange={(next) => setList('tiers', l => l.map((x, j) => (j === i ? next : x)))}
                                    onMove={(d) => moveTier(i, d)}
                                    onRemove={() => setList('tiers', l => l.filter((_, j) => j !== i))} />
                            ))}
                        </div>
                        <div className="grid gap-3 rounded-2xl bg-black/[0.02] p-3 dark:bg-white/[0.02] sm:grid-cols-2">
                            <Field label="Total capacity" optional hint="Across every ticket type">
                                <input className={fieldCls} type="number" inputMode="numeric" min="0" value={form.ticketCapacity} onChange={(e) => set({ ticketCapacity: e.target.value })} placeholder="No limit" />
                            </Field>
                            <Field label="Tickets per order" optional hint="Up to 20; blank is 10">
                                <input className={fieldCls} type="number" inputMode="numeric" min="1" max="20" value={form.maxPerOrder} onChange={(e) => set({ maxPerOrder: e.target.value })} placeholder="10" />
                            </Field>
                            <Field label="Sales open" optional hint="Blank: open now">
                                <input className={fieldCls} type="datetime-local" value={form.salesStart} onChange={(e) => set({ salesStart: e.target.value })} />
                            </Field>
                            <Field label="Sales close" optional hint="Blank: end of the event day">
                                <input className={fieldCls} type="datetime-local" value={form.salesEnd} onChange={(e) => set({ salesEnd: e.target.value })} />
                            </Field>
                            <div className="sm:col-span-2">
                                <Toggle label="Pause sales" hint="Nobody can buy until you switch this off. The page stays up." checked={form.salesPaused} onChange={(v) => set({ salesPaused: v })} />
                            </div>
                        </div>
                        <Field label="Note above the tickets" optional>
                            <input className={fieldCls} value={form.ticketingDescription} onChange={(e) => set({ ticketingDescription: e.target.value })} placeholder="Prices go up on 1 Nov. Kids under 5 enter free." />
                        </Field>
                    </Card>

                    <Card id="map" title="Venue map" hint="Like BookMyShow and District: buyers tap a zone to pick it. Optional.">
                        <VenueMapBuilder value={form.venueMap} onChange={(m) => set({ venueMap: m })} tiers={form.tiers} />
                    </Card>

                    <Card id="payments" title="Payments" hint="How buyers pay. Paid orders wait for your check before the ticket is issued.">
                        <Toggle label="UPI (any UPI app)" hint="Buyers pay in GPay, PhonePe, Paytm or BHIM, then type the 12-digit UTR. You verify it in Orders."
                            checked={form.payments.upi} onChange={(v) => set({ payments: { ...form.payments, upi: v } })} />
                        {form.payments.upi && (
                            <div className="space-y-3 rounded-2xl bg-black/[0.02] p-3 dark:bg-white/[0.02]">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="UPI ID" hint={usesSiteUpi(form) ? 'Blank: the site-wide UPI ID is used' : undefined}>
                                        <input className={fieldCls} value={form.upiId} onChange={(e) => set({ upiId: e.target.value })} placeholder="newbi@okaxis" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                                    </Field>
                                    <Field label="Name buyers see" optional hint="As your bank shows it">
                                        <input className={fieldCls} value={form.upiName} onChange={(e) => set({ upiName: e.target.value })} placeholder="Newbi Entertainment" />
                                    </Field>
                                </div>
                                <Toggle label="This is a business (merchant) UPI ID" hint="Turn on for a PhonePe Business, Paytm for Business or bank merchant ID. Google Pay and PhonePe often block app payments to personal UPI IDs."
                                    checked={form.upiMerchant} onChange={(v) => set({ upiMerchant: v })} />
                                {form.upiMerchant && (
                                    <Field label="Merchant category code" optional hint="4 digits, from your merchant account (e.g. 7929)">
                                        <input className={cn(fieldCls, 'max-w-[160px]')} inputMode="numeric" maxLength={4} value={form.upiMerchantCode} onChange={(e) => set({ upiMerchantCode: e.target.value.replace(/\D/g, '') })} placeholder="7929" />
                                    </Field>
                                )}
                                <Field label="QR image" optional hint="Your bank's QR. Blank: we make one for the exact amount.">
                                    <div className="flex items-center gap-2">
                                        <input className={fieldCls} type="url" inputMode="url" autoCapitalize="off" value={form.qrCodeUrl} onChange={(e) => set({ qrCodeUrl: e.target.value })} placeholder="https://…" />
                                        <Button as="label" variant="secondary" className="h-12 shrink-0 cursor-pointer">
                                            <Upload size={14} /> {uploading === 'qr' ? '…' : 'Upload'}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f, 'qr', (url) => set({ qrCodeUrl: url })); }} />
                                        </Button>
                                    </div>
                                </Field>
                            </div>
                        )}
                        <Toggle
                            label={<span className="inline-flex items-center gap-2">Card, netbanking and UPI via Razorpay {gatewayReady === false && <Badge tone="gray">Not set up</Badge>}</span>}
                            hint={gatewayReady
                                ? 'Confirmed automatically. Razorpay charges its fee on each payment.'
                                : 'Turns on once RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are added in Vercel. Until then buyers only see UPI.'}
                            checked={form.payments.gateway}
                            onChange={(v) => set({ payments: { ...form.payments, gateway: v } })}
                        />
                        {!paidTiers && <p className="text-[12px] text-gray-500">Every ticket type is free right now, so nobody pays.</p>}
                    </Card>

                    <Card id="faqs" title="FAQs and terms"
                        action={<Button variant="secondary" size="sm" className="h-10" onClick={() => setList('faqs', l => [...l, { id: newRowId('faq'), q: '', a: '' }])}><Plus size={14} /> Add question</Button>}>
                        {form.faqs.map((f, i) => (
                            <div key={f.id} className="flex items-start gap-2 rounded-2xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                                <div className="min-w-0 flex-1 space-y-2">
                                    <input className={fieldCls} value={f.q} onChange={(e) => setList('faqs', l => l.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} placeholder="Is there an age limit?" aria-label="Question" />
                                    <textarea className={areaCls} rows={2} value={f.a} onChange={(e) => setList('faqs', l => l.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} placeholder="Yes, 18+. Carry a valid ID." aria-label="Answer" />
                                </div>
                                <IconButton label="Remove question" onClick={() => setList('faqs', l => l.filter((_, j) => j !== i))} danger><Trash2 size={15} /></IconButton>
                            </div>
                        ))}
                        <Field label="Terms and conditions" optional hint="Buyers agree to these before paying">
                            <textarea className={cn(areaCls, 'min-h-[120px]')} value={form.ticketingRules} onChange={(e) => set({ ticketingRules: e.target.value })} placeholder={'Tickets are non-refundable\nEntry is at the organiser’s discretion\nRight of admission reserved'} />
                        </Field>
                    </Card>

                    <Card id="listing" title="Where it shows">
                        <Toggle label="Listed in the app’s Tickets tab" hint="Off: unlisted. Only people with the link can buy." checked={form.listed} onChange={(v) => set({ listed: v })} />
                        <Toggle label="newbi.live home · Upcoming" hint="In the Upcoming section on the website's home page" checked={form.showOnSite} onChange={(v) => set({ showOnSite: v })} />
                        <Toggle label="App home · Upcoming" hint="In the Upcoming rail on the app's Home" checked={form.showInApp} onChange={(v) => set({ showInApp: v })} />
                        {previewUrl && (
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 text-[13px] font-bold text-sky-600 dark:text-neon-blue">
                                <ExternalLink size={14} /> {previewUrl.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                    </Card>
                    <div className="h-2" />
                </form>
            </div>
        </Sheet>
    );
};

export default TicketSaleEditor;
