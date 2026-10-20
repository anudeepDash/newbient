import React, { useMemo, useState } from 'react';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Send from 'lucide-react/dist/esm/icons/send';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Music from 'lucide-react/dist/esm/icons/music';
import Ghost from 'lucide-react/dist/esm/icons/ghost';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import { useStore } from '../../../lib/store';
import { notifyAllUsers } from '../../../lib/notificationTriggers';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Button } from '../ui';
import { BuilderCard, ImageSlot } from '../events/EditorParts';
import { Field, Toggle, Choice, fieldCls, areaCls } from '../uploads/UploadKit';
import { EditorBar, PhoneBar, formatDay, slugify, todayKey, useConfirm, useImageField, useUnsavedWarning } from '../forms/kit';
import { TASK_PRESETS, TASK_PRESET_MAP, giveawayEndsAt } from './giveawayUtils';

export const TASK_ICONS = {
    instagram: Instagram, instagram_like_comment: Instagram, youtube: Youtube, telegram: Send, twitter: Twitter,
    discord: MessageCircle, spotify: Music, snapchat: Ghost, website: Globe, custom: Sparkles,
};

const EMPTY = {
    name: '',
    slug: '',
    description: '',
    prize: '',
    ticketsAvailable: 0,
    showSpinWheel: true,
    endDate: '',
    endTime: '',
    winnerAnnouncementDate: '',
    posterUrl: '',
    giveawayType: 'Standard',
    tasks: [],
    status: 'Open',
    alsoPostToUpcomingEvents: false,
    alsoPostToAnnouncements: false,
    isTicketed: false,
    ticketCategories: [],
    venueLayout: '',
    location: '',
    buttonText: 'PARTICIPATE NOW',
};

const taskId = () => Math.random().toString(36).slice(2, 11);

const countdown = (g) => {
    const end = giveawayEndsAt(g);
    if (!end) return 'No end date';
    const ms = end - Date.now();
    if (ms <= 0) return 'Ended';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    return d ? `${d} days ${h} h left` : `${h} h left`;
};

/** A compact look at the public giveaway page. */
const GiveawayPreview = ({ data }) => (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-zinc-950">
        <div className="relative aspect-[4/5] bg-gray-100 dark:bg-white/[0.04]">
            {data.posterUrl ? <img src={data.posterUrl} alt="" className="h-full w-full object-cover" /> : (
                <span className="absolute inset-0 flex items-center justify-center text-rose-500"><Gift size={40} /></span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-4 text-white backdrop-blur-sm">
                <p className="text-[22px] font-extrabold leading-tight">{data.name || 'Giveaway name'}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[12px] font-semibold text-white/80">
                    <span className="flex items-center gap-1"><Gift size={12} /> {Number(data.ticketsAvailable) || 0} available</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {countdown(data)}</span>
                    {data.winnerAnnouncementDate && <span className="flex items-center gap-1"><Trophy size={12} /> Winners {formatDay(data.winnerAnnouncementDate)}</span>}
                </div>
            </div>
        </div>
        <div className="space-y-3 p-4">
            {data.description && <p className="line-clamp-4 whitespace-pre-line text-[13px] text-gray-600 dark:text-zinc-300">{data.description}</p>}
            {(data.tasks || []).length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[12px] font-bold text-gray-500">Earn more chances</p>
                    {data.tasks.map(t => {
                        const Icon = TASK_ICONS[t.type] || Sparkles;
                        return (
                            <div key={t.id} className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] px-3 py-2 dark:border-white/[0.08]">
                                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent(TASK_PRESET_MAP[t.type]?.tone || 'violet').chip)}><Icon size={14} /></span>
                                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t.label || 'Task'}</span>
                                <span className="text-[12px] font-bold text-rose-600 dark:text-rose-300">+{Number(t.entryScore) || 0} pts</span>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="flex h-11 items-center justify-center rounded-xl bg-gray-900 text-[14px] font-bold text-white dark:bg-white dark:text-black">Enter the giveaway</div>
        </div>
    </div>
);

const GiveawayEditor = ({ giveaway, giveaways, onDone }) => {
    const addToast = useStore(s => s.addToast);
    const editing = Boolean(giveaway?.id);
    const [data, setData] = useState(() => (giveaway ? {
        ...EMPTY,
        ...giveaway,
        tasks: (giveaway.tasks || []).map(t => ({ ...t, config: t.config || { url: '' } })),
        endDate: giveaway.endDate ? String(giveaway.endDate).slice(0, 10) : '',
    } : EMPTY));
    const [slugTouched, setSlugTouched] = useState(editing);
    const [notify, setNotify] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [tried, setTried] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [confirm, confirmEl] = useConfirm();
    useUnsavedWarning(dirty);

    const set = (patch) => { setData(prev => ({ ...prev, ...patch })); setDirty(true); };
    const poster = useImageField(data.posterUrl, (url) => set({ posterUrl: url }));

    const setName = (name) => set(slugTouched ? { name } : { name, slug: slugify(name) });

    // ── tasks ──
    const tasks = data.tasks || [];
    const addTask = (type) => set({ tasks: [...tasks, { id: taskId(), type, label: TASK_PRESET_MAP[type]?.label || 'New task', entryScore: 1, config: { url: '' } }] });
    const updateTask = (i, patch) => set({ tasks: tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
    const moveTask = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= tasks.length) return;
        const next = [...tasks];
        [next[i], next[j]] = [next[j], next[i]];
        set({ tasks: next });
    };

    const problems = useMemo(() => {
        const p = {};
        if (!data.name.trim()) p.name = 'Give the giveaway a name.';
        const slug = String(data.slug || '');
        if (!slug) p.slug = 'Add a link name.';
        else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) p.slug = 'Use lowercase letters, numbers and dashes only.';
        else if ((giveaways || []).some(g => g.id !== giveaway?.id && g.slug === slug)) p.slug = 'Another giveaway already uses this link.';
        if (!String(data.description || '').trim()) p.description = 'Add a short description.';
        if (data.endTime && !data.endDate) p.endDate = 'Pick the end date for that time.';
        if (data.winnerAnnouncementDate && data.endDate && data.winnerAnnouncementDate < data.endDate) p.winnerAnnouncementDate = 'Winners are announced before entries close.';
        if (!(Number(data.ticketsAvailable) >= 0)) p.ticketsAvailable = 'Enter how many are available.';
        tasks.forEach((t, i) => {
            if (!String(t.label || '').trim()) p[`task_${i}`] = 'Give this task a label.';
            else if (t.config?.url && !/^https?:\/\/\S+/i.test(t.config.url.trim())) p[`task_${i}`] = 'The link should start with https://';
            else if (!(Number(t.entryScore) >= 0)) p[`task_${i}`] = 'Points must be 0 or more.';
        });
        return p;
    }, [data, tasks, giveaways, giveaway?.id]);

    const save = async (e) => {
        e?.preventDefault();
        if (saving) return;
        setTried(true);
        const first = Object.values(problems)[0];
        if (first) { addToast(first, 'warning', { title: 'Giveaway not saved yet' }); return; }
        if (editing && giveaway.slug && giveaway.slug !== data.slug && !(await confirm({
            title: 'Change the link?',
            body: `The old link /giveaway/${giveaway.slug} will stop working, including referral links people already shared.`,
            confirmLabel: 'Change link',
            tone: 'accent',
        }))) return;
        if (data.endDate && giveawayEndsAt(data) < new Date() && String(data.status).toLowerCase() !== 'closed' && !(await confirm({
            title: 'The end date has passed',
            body: 'No one will be able to enter. Save anyway?',
            confirmLabel: 'Save anyway',
            tone: 'accent',
        }))) return;

        const { id, createdAt, drawHistory, lastDrawAt, closedAt, ...rest } = data;
        const payload = {
            ...rest,
            name: data.name.trim(),
            slug: data.slug,
            description: data.description.trim(),
            prize: String(data.prize || '').trim(),
            ticketsAvailable: Number(data.ticketsAvailable) || 0,
            ticketCategories: (data.ticketCategories || []).map(c => ({ ...c, price: Number(c.price) || 0 })),
            tasks: tasks.map(t => ({ ...t, label: t.label.trim(), entryScore: Math.round(Number(t.entryScore) || 0), config: { ...(t.config || {}), url: String(t.config?.url || '').trim() } })),
            updatedAt: new Date().toISOString(),
        };
        if (String(payload.status).toLowerCase() === 'open' && String(giveaway?.status || '').toLowerCase() === 'closed') payload.closedAt = null;

        setSaving(true);
        try {
            const store = useStore.getState();
            if (editing) {
                await store.updateGiveaway(giveaway.id, payload);
            } else {
                await store.addGiveaway(payload);
                if (notify) {
                    notifyAllUsers(`New giveaway: ${payload.name}`, payload.description, `/giveaway/${payload.slug}`, payload.posterUrl || '')
                        .catch(err => console.warn('Giveaway notification failed:', err));
                }
            }
            setDirty(false);
            addToast(editing ? 'Giveaway saved.' : 'Giveaway published.', 'success');
            onDone(true);
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', {
                title: 'Giveaway not saved',
                action: { label: 'Try again', onClick: () => save() },
            });
        } finally {
            setSaving(false);
        }
    };

    const leave = async () => {
        if (dirty && !(await confirm({ title: 'Leave without saving?', body: 'Your changes to this giveaway will be lost.', confirmLabel: 'Leave', cancelLabel: 'Keep editing' }))) return;
        setDirty(false);
        onDone(false);
    };

    const err = (key) => (tried ? problems[key] : null);
    const bad = (key) => err(key) && 'border-red-500/60';
    const Hint = ({ k }) => (err(k) ? <p role="alert" className="mt-1 text-[12px] font-semibold text-red-600 dark:text-red-400">{err(k)}</p> : null);
    const saveLabel = saving ? 'Saving…' : editing ? 'Save changes' : 'Publish giveaway';

    return (
        <div className="pb-28 sm:pb-10">
            <EditorBar backLabel="Giveaways" onBack={leave} title={data.name || (editing ? 'Edit giveaway' : 'New giveaway')}>
                <Button variant="secondary" onClick={() => setShowPreview(v => !v)} className="h-10 xl:hidden">
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />} {showPreview ? 'Edit' : 'Preview'}
                </Button>
                <Button variant="primary" type="submit" form="giveaway-editor" disabled={saving || poster.uploading} className="hidden h-10 sm:inline-flex">{saveLabel}</Button>
            </EditorBar>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form id="giveaway-editor" onSubmit={save} noValidate className={cn('space-y-5', showPreview && 'hidden xl:block')}>
                    <BuilderCard title="Basics" hint="What people can win">
                        <div className="space-y-3">
                            <Field label="Name">
                                <input className={cn(fieldCls, bad('name'))} value={data.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Win passes to UN40 Music Festival" />
                            </Field>
                            <Field label="Link" hint={`newbi.live/giveaway/${data.slug || '…'}`}>
                                <input className={cn(fieldCls, 'font-mono text-[14px]', bad('slug'))} value={data.slug} autoCapitalize="off" onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }); }} placeholder="un40-giveaway" />
                                <Hint k="slug" />
                            </Field>
                            <Field label="Description">
                                <textarea className={cn(areaCls, bad('description'))} rows={4} value={data.description} onChange={(e) => set({ description: e.target.value })} placeholder="What's up for grabs, who can enter and how winners are picked" />
                            </Field>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                                <Field label="Prize" optional hint="Used in the winner's notification">
                                    <input className={fieldCls} value={data.prize || ''} onChange={(e) => set({ prize: e.target.value })} placeholder="e.g. 2 GA passes" />
                                </Field>
                                <Field label="Number available" hint="Shown as “N available”">
                                    <input className={cn(fieldCls, bad('ticketsAvailable'))} type="number" min="0" inputMode="numeric" value={data.ticketsAvailable} onChange={(e) => set({ ticketsAvailable: e.target.value })} />
                                </Field>
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Dates" hint="Entries close automatically at the end time">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <Field label="Entries close on" optional>
                                <input className={cn(fieldCls, bad('endDate'))} type="date" min={editing ? undefined : todayKey()} value={data.endDate || ''} onChange={(e) => set({ endDate: e.target.value })} />
                            </Field>
                            <Field label="at" optional hint="End of day if empty">
                                <input className={fieldCls} type="time" value={data.endTime || ''} disabled={!data.endDate} onChange={(e) => set({ endTime: e.target.value })} />
                            </Field>
                            <Field label="Winners announced" optional className="col-span-2 sm:col-span-1">
                                <input className={cn(fieldCls, bad('winnerAnnouncementDate'))} type="date" value={data.winnerAnnouncementDate || ''} onChange={(e) => set({ winnerAnnouncementDate: e.target.value })} />
                            </Field>
                        </div>
                        <Hint k="endDate" /><Hint k="winnerAnnouncementDate" />
                        {!data.endDate && <p className="mt-2 text-[12px] text-gray-500">Without an end date the giveaway stays open until you close it.</p>}
                    </BuilderCard>

                    <BuilderCard title="Tasks" hint="Extra points for following, sharing and visiting. More points, more chances.">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {TASK_PRESETS.map(p => {
                                    const Icon = TASK_ICONS[p.type];
                                    return (
                                        <button key={p.type} type="button" onClick={() => addTask(p.type)} className="flex min-h-12 items-center gap-2 rounded-xl border border-black/[0.08] px-2.5 py-2 text-left transition-colors hover:border-black/20 active:scale-[0.98] dark:border-white/[0.08] dark:hover:border-white/20">
                                            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accent(p.tone).chip)}><Icon size={14} /></span>
                                            <span className="truncate text-[12px] font-bold">{p.short}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {tasks.length === 0 ? (
                                <p className="rounded-xl bg-black/[0.03] p-4 text-center text-[13px] text-gray-500 dark:bg-white/[0.03]">No tasks yet. Everyone gets 1 point for entering and 3 for each friend they refer.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {tasks.map((t, i) => {
                                        const Icon = TASK_ICONS[t.type] || Sparkles;
                                        return (
                                            <li key={t.id} className={cn('rounded-2xl border p-3', err(`task_${i}`) ? 'border-red-500/40' : 'border-black/[0.08] dark:border-white/[0.08]')}>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent(TASK_PRESET_MAP[t.type]?.tone || 'violet').chip)}><Icon size={15} /></span>
                                                    <input className={cn(fieldCls, 'h-11 text-[14px]')} value={t.label} onChange={(e) => updateTask(i, { label: e.target.value })} placeholder="What should they do?" aria-label="Task label" />
                                                    <button type="button" onClick={() => moveTask(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-25 dark:hover:bg-white/5"><ArrowUp size={15} /></button>
                                                    <button type="button" onClick={() => moveTask(i, 1)} disabled={i === tasks.length - 1} aria-label="Move down" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-25 dark:hover:bg-white/5"><ArrowDown size={15} /></button>
                                                </div>
                                                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_92px_40px] gap-2">
                                                    <input className={cn(fieldCls, 'h-11 font-mono text-[13px]')} inputMode="url" autoCapitalize="off" value={t.config?.url || ''} onChange={(e) => updateTask(i, { config: { ...(t.config || {}), url: e.target.value } })} placeholder="https://… (where the button goes)" aria-label="Task link" />
                                                    <label className="relative">
                                                        <input className={cn(fieldCls, 'h-11 pr-9 text-[14px]')} type="number" min="0" inputMode="numeric" value={t.entryScore} onChange={(e) => updateTask(i, { entryScore: e.target.value })} aria-label="Points" />
                                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-gray-400">pts</span>
                                                    </label>
                                                    <button type="button" onClick={() => set({ tasks: tasks.filter((_, j) => j !== i) })} aria-label="Remove task" className="flex h-11 w-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button>
                                                </div>
                                                <Hint k={`task_${i}`} />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <Toggle label="Spin the wheel" hint="Entrants get one bonus spin for extra points" checked={data.showSpinWheel !== false} onChange={(v) => set({ showSpinWheel: v })} />
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Poster" hint="Upload, paste or link · portrait works best">
                        <div className="max-w-[240px]">
                            <ImageSlot label={poster.uploading ? 'Uploading…' : 'Poster'} hint="4:5 portrait" aspect="aspect-[4/5]" {...poster.slotProps} />
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Status and sharing">
                        <div className="space-y-4">
                            <Choice value={String(data.status).toLowerCase() === 'closed' ? 'Closed' : 'Open'} onChange={(v) => set({ status: v })} options={[
                                { value: 'Open', label: 'Open', hint: 'Taking entries' },
                                { value: 'Closed', label: 'Closed', hint: 'No new entries; winner shown' },
                            ]} />
                            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                                <div className="pb-3"><Toggle label="Show on the home page" hint="A card in Upcoming events that stays in step with this giveaway" checked={Boolean(data.alsoPostToUpcomingEvents)} onChange={(v) => set({ alsoPostToUpcomingEvents: v })} /></div>
                                {data.alsoPostToUpcomingEvents && (
                                    <div className="grid gap-3 py-3 sm:grid-cols-2">
                                        <Field label="Card location" optional><input className={fieldCls} value={data.location || ''} onChange={(e) => set({ location: e.target.value })} placeholder="Online" /></Field>
                                        <Field label="Card button" optional><input className={fieldCls} value={data.buttonText || ''} onChange={(e) => set({ buttonText: e.target.value })} placeholder="PARTICIPATE NOW" /></Field>
                                    </div>
                                )}
                                <div className="py-3"><Toggle label="Post to announcements" hint="Adds it to the announcements feed" checked={Boolean(data.alsoPostToAnnouncements)} onChange={(v) => set({ alsoPostToAnnouncements: v })} /></div>
                                {!editing && <div className="pt-3"><Toggle label="Notify everyone" hint="An in-app and push notification when it's published" checked={notify} onChange={setNotify} /></div>}
                            </div>
                        </div>
                    </BuilderCard>
                </form>

                <aside className={cn('mx-auto w-full max-w-sm space-y-3 xl:sticky xl:top-24 xl:max-w-none xl:self-start', !showPreview && 'hidden xl:block')}>
                    <p className="text-[12px] font-bold text-gray-500">Live preview</p>
                    <GiveawayPreview data={data} />
                </aside>
            </div>

            <PhoneBar>
                <Button variant="ghost" onClick={leave} className="h-12">Cancel</Button>
                <Button variant="primary" type="submit" form="giveaway-editor" disabled={saving || poster.uploading} className="h-12 flex-1">{saveLabel}</Button>
            </PhoneBar>
            {confirmEl}
        </div>
    );
};

export default GiveawayEditor;
