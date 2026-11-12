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
import Brain from 'lucide-react/dist/esm/icons/brain';
import KeyRound from 'lucide-react/dist/esm/icons/key-round';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { useStore } from '../../../lib/store';
import { notifyAllUsers } from '../../../lib/notificationTriggers';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Button } from '../ui';
import { BuilderCard, ImageSlot } from '../events/EditorParts';
import { Field, Toggle, Choice, fieldCls, areaCls } from '../uploads/UploadKit';
import CityInput, { cleanCity } from '../CityInput';
import LivePreview from '../LivePreview';
import { AmbientColorField, EditorBar, PhoneBar, slugify, todayKey, useConfirm, useImageField, useUnsavedWarning } from '../forms/kit';
import { TASK_PRESETS, TASK_PRESET_MAP, giveawayEndsAt } from './giveawayUtils';
import { DEFAULT_REFERRAL_POINTS, DEFAULT_WHEEL } from '../../../lib/giveawayRules';

export const TASK_ICONS = {
    instagram: Instagram, instagram_like_comment: Instagram, youtube: Youtube, telegram: Send, twitter: Twitter,
    discord: MessageCircle, spotify: Music, snapchat: Ghost, website: Globe, custom: Sparkles,
    quiz: Brain, code: KeyRound,
};

const EMPTY = {
    name: '',
    slug: '',
    description: '',
    prize: '',
    ticketsAvailable: 0,
    showSpinWheel: true,
    winnerCount: 1,
    referralPoints: DEFAULT_REFERRAL_POINTS,
    referralMilestones: [{ at: 3, bonus: 5 }, { at: 5, bonus: 10 }, { at: 10, bonus: 25 }],
    bonusSpinEvery: 2,
    dailyBonus: { enabled: true, points: 2 },
    wheel: [],
    endDate: '',
    endTime: '',
    winnerAnnouncementDate: '',
    posterUrl: '',
    ambientColor: '',
    giveawayType: 'Standard',
    tasks: [],
    status: 'Open',
    alsoPostToUpcomingEvents: false,
    alsoPostToAnnouncements: false,
    isTicketed: false,
    ticketCategories: [],
    venueLayout: '',
    location: '',
    city: '',
    buttonText: 'PARTICIPATE NOW',
};

const taskId = () => Math.random().toString(36).slice(2, 11);

/* What a new task of each kind starts with. */
const taskConfig = (type) => {
    if (type === 'quiz') return { url: '', question: '', options: ['', '', ''], answer: 0 };
    if (type === 'code') return { url: '', code: '', hint: '' };
    return { url: '' };
};

/* Giveaways made before boosters existed keep their old behaviour until someone turns them on. */
const BOOSTERS_OFF = { winnerCount: 1, referralPoints: DEFAULT_REFERRAL_POINTS, referralMilestones: [], bonusSpinEvery: 0, dailyBonus: { enabled: false, points: 2 }, wheel: [] };
const intOr = (v, d) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? d : Math.round(Number(v)));

const GiveawayEditor = ({ giveaway, giveaways, onDone }) => {
    const addToast = useStore(s => s.addToast);
    const editing = Boolean(giveaway?.id);
    const [data, setData] = useState(() => (giveaway ? {
        ...EMPTY,
        ...BOOSTERS_OFF,
        ...giveaway,
        dailyBonus: { ...BOOSTERS_OFF.dailyBonus, ...(giveaway.dailyBonus || {}) },
        tasks: (giveaway.tasks || []).map(t => ({ ...t, config: { ...taskConfig(t.type), ...(t.config || {}) } })),
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
    const addTask = (type) => set({ tasks: [...tasks, { id: taskId(), type, label: TASK_PRESET_MAP[type]?.label || 'New task', entryScore: type === 'quiz' ? 3 : type === 'code' ? 5 : 1, config: taskConfig(type) }] });
    const setConfig = (i, patch) => updateTask(i, { config: { ...(tasks[i].config || {}), ...patch } });

    // ── boosters ──
    const milestones = data.referralMilestones || [];
    const setMilestone = (i, patch) => set({ referralMilestones: milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
    const wheel = data.wheel?.length ? data.wheel : [];
    const setWheel = (next) => set({ wheel: next });
    const customWheel = wheel.length > 0;
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
            else if (t.type === 'quiz') {
                const opts = (t.config?.options || []).filter(o => String(o).trim());
                if (!String(t.config?.question || '').trim()) p[`task_${i}`] = 'Write the quiz question.';
                else if (opts.length < 2) p[`task_${i}`] = 'Give the quiz at least two answers.';
                else if (!String(t.config?.options?.[Number(t.config.answer)] || '').trim()) p[`task_${i}`] = 'Mark which answer is right.';
            } else if (t.type === 'code' && !String(t.config?.code || '').replace(/[^a-z0-9]/gi, '')) p[`task_${i}`] = 'Set the secret code.';
        });
        if (!(Number(data.winnerCount) >= 1)) p.winnerCount = 'At least one winner.';
        milestones.forEach((m, i) => { if (!(Number(m.at) >= 1) || !(Number(m.bonus) >= 1)) p[`milestone_${i}`] = 'Each milestone needs a number of friends and bonus points.'; });
        if (wheel.length && (wheel.length < 2 || wheel.length > 8)) p.wheel = 'A wheel needs 2 to 8 segments.';
        else if (wheel.some(w => !(Number(w.weight) > 0))) p.wheel = 'Every segment needs a chance above 0.';
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
            city: cleanCity(data.city),
            ticketsAvailable: Number(data.ticketsAvailable) || 0,
            ticketCategories: (data.ticketCategories || []).map(c => ({ ...c, price: Number(c.price) || 0 })),
            tasks: tasks.map(t => {
                const config = { ...(t.config || {}), url: String(t.config?.url || '').trim() };
                if (t.type === 'quiz') {
                    // Drop empty answers and keep the right one pointing at the same text.
                    const right = String(config.options?.[Number(config.answer)] || '').trim();
                    const options = (config.options || []).map(o => String(o).trim()).filter(Boolean);
                    config.question = String(config.question || '').trim();
                    config.options = options;
                    config.answer = Math.max(0, options.indexOf(right));
                }
                if (t.type === 'code') { config.code = String(config.code || '').trim(); config.hint = String(config.hint || '').trim(); }
                return { ...t, label: t.label.trim(), entryScore: Math.round(Number(t.entryScore) || 0), config };
            }),
            winnerCount: Math.max(1, intOr(data.winnerCount, 1)),
            referralPoints: Math.max(0, intOr(data.referralPoints, DEFAULT_REFERRAL_POINTS)),
            referralMilestones: milestones.map(m => ({ at: intOr(m.at, 0), bonus: intOr(m.bonus, 0) })).filter(m => m.at > 0 && m.bonus > 0).sort((a, b) => a.at - b.at),
            bonusSpinEvery: Math.max(0, intOr(data.bonusSpinEvery, 0)),
            dailyBonus: { enabled: Boolean(data.dailyBonus?.enabled), points: Math.max(0, intOr(data.dailyBonus?.points, 2)) },
            wheel: wheel.map((w, i) => ({ id: w.id || `seg_${i}`, label: String(w.label || '').trim() || (Number(w.points) === 1 ? '+1 point' : `+${intOr(w.points, 0)} points`), points: Math.max(0, intOr(w.points, 0)), weight: Math.max(0, intOr(w.weight, 0)) })),
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
                                <Field label="City" optional hint="Leave empty if it's open everywhere">
                                    <CityInput className={fieldCls} value={data.city} onChange={(v) => set({ city: v })} />
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
                                <p className="rounded-xl bg-black/[0.03] p-4 text-center text-[13px] text-gray-500 dark:bg-white/[0.03]">No tasks yet. Everyone gets 1 point for entering, plus whatever the boosters below add.</p>
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
                                                    {t.type === 'quiz'
                                                        ? <p className="flex h-11 items-center text-[12px] text-gray-500">One try each. Points only for the right answer.</p>
                                                        : <input className={cn(fieldCls, 'h-11 font-mono text-[13px]')} inputMode="url" autoCapitalize="off" value={t.config?.url || ''} onChange={(e) => setConfig(i, { url: e.target.value })} placeholder={t.type === 'code' ? 'https://… (optional: the post with the code)' : 'https://… (where the button goes)'} aria-label="Task link" />}
                                                    <label className="relative">
                                                        <input className={cn(fieldCls, 'h-11 pr-9 text-[14px]')} type="number" min="0" inputMode="numeric" value={t.entryScore} onChange={(e) => updateTask(i, { entryScore: e.target.value })} aria-label="Points" />
                                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-gray-400">pts</span>
                                                    </label>
                                                    <button type="button" onClick={() => set({ tasks: tasks.filter((_, j) => j !== i) })} aria-label="Remove task" className="flex h-11 w-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button>
                                                </div>
                                                {t.type === 'quiz' && (
                                                    <div className="mt-3 space-y-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                                                        <input className={cn(fieldCls, 'h-11 text-[14px]')} value={t.config?.question || ''} onChange={(e) => setConfig(i, { question: e.target.value })} placeholder="Question, e.g. Which film is “Teri Ore” from?" aria-label="Quiz question" />
                                                        {(t.config?.options || []).map((o, k) => (
                                                            <div key={k} className="flex items-center gap-2">
                                                                <button type="button" onClick={() => setConfig(i, { answer: k })} aria-label={`Mark answer ${k + 1} as right`} className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-black', Number(t.config.answer) === k ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-black/15 text-gray-400 dark:border-white/20')}>{String.fromCharCode(65 + k)}</button>
                                                                <input className={cn(fieldCls, 'h-10 text-[14px]')} value={o} onChange={(e) => setConfig(i, { options: t.config.options.map((x, z) => (z === k ? e.target.value : x)) })} placeholder={`Answer ${k + 1}`} aria-label={`Answer ${k + 1}`} />
                                                                {t.config.options.length > 2 && <button type="button" onClick={() => setConfig(i, { options: t.config.options.filter((_, z) => z !== k), answer: Number(t.config.answer) === k ? 0 : Number(t.config.answer) > k ? Number(t.config.answer) - 1 : Number(t.config.answer) })} aria-label="Remove answer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"><X size={14} /></button>}
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center justify-between">
                                                            {(t.config?.options || []).length < 6 && <button type="button" onClick={() => setConfig(i, { options: [...(t.config.options || []), ''] })} className="flex items-center gap-1 text-[12px] font-bold text-emerald-700 dark:text-neon-green"><Plus size={13} /> Add answer</button>}
                                                            <span className="text-[11px] text-gray-500">Tap a letter to mark the right answer. Never shown to entrants.</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {t.type === 'code' && (
                                                    <div className="mt-3 grid gap-2 rounded-xl bg-black/[0.03] p-3 sm:grid-cols-[180px_minmax(0,1fr)] dark:bg-white/[0.03]">
                                                        <input className={cn(fieldCls, 'h-11 font-mono text-[14px] uppercase tracking-widest')} value={t.config?.code || ''} onChange={(e) => setConfig(i, { code: e.target.value })} placeholder="SHREYA26" aria-label="Secret code" autoCapitalize="characters" />
                                                        <input className={cn(fieldCls, 'h-11 text-[14px]')} value={t.config?.hint || ''} onChange={(e) => setConfig(i, { hint: e.target.value })} placeholder="Hint, e.g. It's in our latest Instagram story" aria-label="Hint" />
                                                        <p className="text-[11px] text-gray-500 sm:col-span-2">Post the code somewhere (a story, a reel caption, the event) and people type it to unlock the points. Spaces and dashes don't matter; 5 tries each. The code stays on the server.</p>
                                                    </div>
                                                )}
                                                <Hint k={`task_${i}`} />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Boosters" hint="Ways to keep people coming back and bringing friends. Points are counted on the server.">
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Winners" hint="Shown on the page and used for the odds">
                                    <input className={cn(fieldCls, bad('winnerCount'))} type="number" min="1" inputMode="numeric" value={data.winnerCount} onChange={(e) => set({ winnerCount: e.target.value })} />
                                </Field>
                                <Field label="Points per friend" hint="For each friend who enters with their link">
                                    <input className={fieldCls} type="number" min="0" inputMode="numeric" value={data.referralPoints} onChange={(e) => set({ referralPoints: e.target.value })} />
                                </Field>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[13px] font-bold">Referral milestones</p>
                                    {milestones.length < 6 && <button type="button" onClick={() => set({ referralMilestones: [...milestones, { at: (Number(milestones[milestones.length - 1]?.at) || 0) + 5, bonus: 10 }] })} className="flex items-center gap-1 text-[12px] font-bold text-emerald-700 dark:text-neon-green"><Plus size={13} /> Add</button>}
                                </div>
                                {milestones.length === 0 ? <p className="text-[12px] text-gray-500">None. Add one to give a bonus when someone reaches a number of friends.</p> : milestones.map((m, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[13px]">
                                        <input className={cn(fieldCls, 'h-10 w-20 text-[14px]')} type="number" min="1" inputMode="numeric" value={m.at} onChange={(e) => setMilestone(i, { at: e.target.value })} aria-label="Friends" />
                                        <span className="shrink-0 text-gray-500">friends →</span>
                                        <input className={cn(fieldCls, 'h-10 w-20 text-[14px]')} type="number" min="1" inputMode="numeric" value={m.bonus} onChange={(e) => setMilestone(i, { bonus: e.target.value })} aria-label="Bonus points" />
                                        <span className="shrink-0 text-gray-500">bonus pts</span>
                                        <button type="button" onClick={() => set({ referralMilestones: milestones.filter((_, j) => j !== i) })} aria-label="Remove milestone" className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                                {milestones.map((_, i) => <Hint key={i} k={`milestone_${i}`} />)}
                            </div>

                            <div className="space-y-3 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                                <Toggle label="Daily bonus" hint="Points for every day someone comes back and claims it" checked={Boolean(data.dailyBonus?.enabled)} onChange={(v) => set({ dailyBonus: { ...(data.dailyBonus || {}), enabled: v } })} />
                                {data.dailyBonus?.enabled && (
                                    <Field label="Points a day">
                                        <input className={cn(fieldCls, 'max-w-[120px]')} type="number" min="1" inputMode="numeric" value={data.dailyBonus.points} onChange={(e) => set({ dailyBonus: { ...data.dailyBonus, points: e.target.value } })} />
                                    </Field>
                                )}
                            </div>

                            <div className="space-y-3 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                                <Toggle label="Spin the wheel" hint="Everyone gets one spin; every spin wins points" checked={data.showSpinWheel !== false} onChange={(v) => set({ showSpinWheel: v })} />
                                {data.showSpinWheel !== false && (
                                    <>
                                        <Field label="Extra spins" hint="Earned by inviting friends">
                                            <select className={cn(fieldCls, 'max-w-[260px]')} value={String(data.bonusSpinEvery || 0)} onChange={(e) => set({ bonusSpinEvery: Number(e.target.value) })}>
                                                <option value="0">No extra spins</option>
                                                <option value="1">One for every friend</option>
                                                <option value="2">One for every 2 friends</option>
                                                <option value="3">One for every 3 friends</option>
                                                <option value="5">One for every 5 friends</option>
                                            </select>
                                        </Field>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[13px] font-bold">Wheel</p>
                                                <button type="button" onClick={() => setWheel(customWheel ? [] : DEFAULT_WHEEL.map(w => ({ ...w })))} className="text-[12px] font-bold text-emerald-700 dark:text-neon-green">{customWheel ? 'Use the standard wheel' : 'Customise'}</button>
                                            </div>
                                            {!customWheel ? (
                                                <p className="text-[12px] text-gray-500">Standard: +1 (40%), +2 (30%), +5 (30%).</p>
                                            ) : (
                                                <>
                                                    {wheel.map((w, i) => {
                                                        const total = wheel.reduce((n, x) => n + (Number(x.weight) || 0), 0);
                                                        return (
                                                            <div key={i} className="flex items-center gap-2 text-[13px]">
                                                                <input className={cn(fieldCls, 'h-10 min-w-0 flex-1 text-[14px]')} value={w.label} onChange={(e) => setWheel(wheel.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label, e.g. JACKPOT" aria-label="Segment label" />
                                                                <input className={cn(fieldCls, 'h-10 w-16 text-[14px]')} type="number" min="0" inputMode="numeric" value={w.points} onChange={(e) => setWheel(wheel.map((x, j) => (j === i ? { ...x, points: e.target.value } : x)))} aria-label="Points" />
                                                                <span className="shrink-0 text-gray-500">pts</span>
                                                                <input className={cn(fieldCls, 'h-10 w-16 text-[14px]')} type="number" min="0" inputMode="numeric" value={w.weight} onChange={(e) => setWheel(wheel.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} aria-label="Chance weight" />
                                                                <span className="w-10 shrink-0 text-right tabular-nums text-gray-500">{total ? Math.round(((Number(w.weight) || 0) / total) * 100) : 0}%</span>
                                                                <button type="button" onClick={() => setWheel(wheel.filter((_, j) => j !== i))} disabled={wheel.length <= 2} aria-label="Remove segment" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-25"><Trash2 size={14} /></button>
                                                            </div>
                                                        );
                                                    })}
                                                    {wheel.length < 8 && <button type="button" onClick={() => setWheel([...wheel, { label: '+10 points', points: 10, weight: 5 }])} className="flex items-center gap-1 text-[12px] font-bold text-emerald-700 dark:text-neon-green"><Plus size={13} /> Add segment</button>}
                                                    <p className="text-[11px] text-gray-500">The second number is the chance weight: bigger means more likely.</p>
                                                    <Hint k="wheel" />
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Poster" hint="Upload, paste or link · portrait works best">
                        <div className="grid gap-5 sm:grid-cols-[240px_minmax(0,1fr)]">
                            <ImageSlot label={poster.uploading ? 'Uploading…' : 'Poster'} hint="4:5 portrait" aspect="aspect-[4/5]" {...poster.slotProps} />
                            <AmbientColorField image={data.posterUrl} value={data.ambientColor} onChange={(v) => set({ ambientColor: v })} />
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
                    <LivePreview type="giveaway" data={data} />
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
