import React, { useEffect, useMemo, useRef, useState } from 'react';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Bell from 'lucide-react/dist/esm/icons/bell';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { notifyAllUsers } from '../../../lib/notificationTriggers';
import Sheet from '../Sheet';
import { Button, Badge } from '../ui';
import { fieldCls, areaCls, Field, Toggle, Choice } from '../uploads/UploadKit';
import { BuilderCard } from '../events/EditorParts';
import { CharCount, LabelRow, ImagePicker, FramingControls, framedBackground } from './ContentKit';
import {
    ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES, announcementWindow, announcementState,
    toDateInput, toTimeInput, fromDateTimeInputs, todayInput, formatDayTime,
} from './contentRules';
import ThemedSelect from '../ThemedSelect';

const blank = () => ({
    title: '', tagline: '', content: '', category: 'NEWS', priority: 'Normal',
    image: '', imageTransform: { scale: 1, x: 0, y: 0 }, link: '', buttonText: 'Read more',
    isPinned: false,
    startMode: 'now', startDate: todayInput(), startTime: '10:00',
    endMode: 'never', endDate: '', endTime: '23:59',
    notifyPush: true, notifyEmail: false,
});

const fromRecord = (a, asCopy) => {
    const { start, end } = announcementWindow(a);
    const futureStart = start && start.getTime() > Date.now();
    return {
        ...blank(),
        title: a.title || '',
        tagline: a.tagline || '',
        content: a.content || '',
        category: String(a.category || 'NEWS').toUpperCase(),
        priority: a.priority || 'Normal',
        image: a.image || '',
        imageTransform: a.imageTransform || { scale: 1, x: 0, y: 0 },
        link: a.link || '',
        buttonText: a.buttonText ? (a.buttonText === a.buttonText.toUpperCase() ? a.buttonText.charAt(0) + a.buttonText.slice(1).toLowerCase() : a.buttonText) : 'Read more',
        isPinned: asCopy ? false : !!a.isPinned,
        startMode: !asCopy && futureStart ? 'later' : 'now',
        startDate: !asCopy && futureStart ? toDateInput(start) : todayInput(),
        startTime: !asCopy && futureStart ? toTimeInput(start) : '10:00',
        endMode: !asCopy && end ? 'until' : 'never',
        endDate: !asCopy && end ? toDateInput(end) : '',
        endTime: !asCopy && end ? toTimeInput(end) : '23:59',
        notifyPush: !!asCopy,
        notifyEmail: false,
    };
};

/** Where an announcement leads when tapped. */
export const announcementDestination = (a) => a?.link || (a?.linkedEventId ? `/?event=${a.linkedEventId}` : '');

/** Send the in-app + push notification (and optional email) for an announcement. */
export const sendAnnouncementNotification = (a, email = false) =>
    notifyAllUsers(a.title, a.content || a.tagline || '', announcementDestination(a) || '/', a.image || '', email);

/**
 * Create or edit an announcement: message, image, button, where and when it
 * shows, and who gets told. `record` = the announcement being edited, or
 * { copyOf } to start from another one.
 */
const AnnouncementComposer = ({ open, onClose, record, onSaved }) => {
    const { addAnnouncement, updateAnnouncement, addToast } = useStore();
    const editing = record && !record.copyOf ? record : null;
    const [form, setForm] = useState(blank);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);
    const lock = useRef(false);

    // Fill the form when it opens (keyed by id, so live updates don't wipe typing).
    const recordKey = record?.copyOf ? `copy:${record.copyOf.id}` : record?.id || 'new';
    useEffect(() => {
        if (!open) return;
        setTouched(false);
        if (record?.copyOf) setForm(fromRecord(record.copyOf, true));
        else if (record) setForm(fromRecord(record, false));
        else setForm(blank());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, recordKey]);

    const set = (patch) => setForm(f => ({ ...f, ...patch }));

    const startsAt = form.startMode === 'later' ? fromDateTimeInputs(form.startDate, form.startTime) : '';
    const endsAt = form.endMode === 'until' ? fromDateTimeInputs(form.endDate, form.endTime, '23:59') : '';
    const scheduled = !!startsAt && new Date(startsAt).getTime() > Date.now();
    const problems = useMemo(() => {
        const out = {};
        if (!form.title.trim()) out.title = 'Add a headline.';
        if (!form.content.trim()) out.content = 'Add the message.';
        if (form.startMode === 'later' && !startsAt) out.start = 'Pick a start date.';
        if (form.endMode === 'until' && !endsAt) out.end = 'Pick an end date.';
        if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) out.end = 'The end has to be after the start.';
        if (form.link && !/^(https?:\/\/|\/|mailto:|tel:)/i.test(form.link.trim())) out.link = 'Start the link with https:// or a / for a page on this site.';
        return out;
    }, [form, startsAt, endsAt]);
    const endPassed = endsAt && new Date(endsAt).getTime() < Date.now();
    const canNotify = !scheduled && !endPassed;
    const wantsNotify = canNotify && form.notifyPush && (!editing || !editing.notifiedAt || form.forceNotify);

    const save = async () => {
        setTouched(true);
        if (Object.keys(problems).length) return;
        if (lock.current) return;
        lock.current = true;
        setSaving(true);
        const now = new Date().toISOString();
        const payload = {
            title: form.title.trim(),
            tagline: form.tagline.trim(),
            content: form.content.trim(),
            category: form.category,
            priority: form.priority,
            image: form.image || '',
            imageTransform: form.imageTransform || { scale: 1, x: 0, y: 0 },
            link: form.link.trim(),
            buttonText: form.buttonText.trim() || 'Read more',
            isPinned: !!form.isPinned,
            startsAt,
            endsAt,
            // `date` stays for older screens that still read it.
            date: toDateInput(startsAt || now),
            updatedAt: now,
        };
        try {
            if (editing) {
                await updateAnnouncement(editing.id, payload);
                if (wantsNotify && form.notifyPush) {
                    const claimed = await useStore.getState().claimContentNotification('announcements', editing.id, { force: !!form.forceNotify });
                    if (claimed) await sendAnnouncementNotification({ ...editing, ...payload }, form.notifyEmail);
                }
                addToast('Announcement saved.', 'success');
            } else {
                const notify = wantsNotify && form.notifyPush;
                await addAnnouncement({
                    ...payload,
                    createdAt: now,
                    ...(notify ? { notifiedAt: now, notifyCount: 1 } : {}),
                });
                if (notify) await sendAnnouncementNotification(payload, form.notifyEmail);
                addToast(scheduled ? `Scheduled for ${formatDayTime(startsAt)}.` : notify ? 'Published and everyone was notified.' : 'Announcement published.', 'success');
            }
            onSaved?.();
            onClose();
        } catch (err) {
            console.error('Announcement save failed:', err);
            addToast("Couldn't save the announcement. Please try again.", 'error');
        } finally {
            lock.current = false;
            setSaving(false);
        }
    };

    const err = (k) => touched && problems[k] ? <span role="alert" className="mt-1 block text-[12px] font-semibold text-red-600 dark:text-red-400">{problems[k]}</span> : null;
    const primaryLabel = saving ? 'Saving…' : editing ? 'Save changes' : scheduled ? 'Schedule' : 'Publish';
    const state = editing ? announcementState({ ...editing, startsAt, endsAt }) : (scheduled ? 'scheduled' : endPassed ? 'ended' : 'live');

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            size="xl"
            title={editing ? 'Edit announcement' : 'New announcement'}
            subtitle={editing ? (editing.title || '') : 'Tell people what is happening'}
            footer={(
                <div className="flex items-center gap-2">
                    <p className="hidden min-w-0 flex-1 truncate text-[12px] text-gray-500 sm:block">
                        {state === 'scheduled' ? `Starts ${formatDayTime(startsAt)}` : state === 'ended' ? "Ended — it won't show on the site" : form.isPinned ? 'Shows in the website banner' : 'Not in the website banner'}
                    </p>
                    <Button variant="secondary" onClick={onClose} disabled={saving} className="h-12 flex-1 sm:flex-none">Cancel</Button>
                    <Button variant="accent" onClick={save} disabled={saving} className="h-12 flex-[2] sm:flex-none sm:px-6">{primaryLabel}</Button>
                </div>
            )}
        >
            <div className="space-y-5">
                <BuilderCard title="Message" hint="Short and clear: it shows in a one-line banner">
                    <div className="space-y-4">
                        <label className="block">
                            <LabelRow label="Headline" right={<CharCount value={form.title} ideal={20} max={70} />} />
                            <input className={fieldCls} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Tickets for Sunburn are live" maxLength={120} />
                            {err('title')}
                        </label>
                        <label className="block">
                            <LabelRow label="Message" right={<CharCount value={form.content} ideal={40} max={160} />} />
                            <textarea className={cn(areaCls, 'min-h-[110px] resize-y')} value={form.content} onChange={(e) => set({ content: e.target.value })} placeholder="One or two sentences. The banner shows the start of this next to the headline." />
                            {err('content')}
                        </label>
                        <Field label="Tagline" optional>
                            <input className={fieldCls} value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="A short hook" />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Category">
                                <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={form.category} onChange={(e) => set({ category: e.target.value })}>
                                    {ANNOUNCEMENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    {!ANNOUNCEMENT_CATEGORIES.some(c => c.value === form.category) && <option value={form.category}>{form.category}</option>}
                                </ThemedSelect>
                            </Field>
                            <div>
                                <span className="mb-1 block text-[12px] font-bold text-gray-500">Priority</span>
                                <Choice value={form.priority} onChange={(v) => set({ priority: v })} options={ANNOUNCEMENT_PRIORITIES.map(p => ({ value: p.value, label: p.label }))} />
                            </div>
                        </div>
                    </div>
                </BuilderCard>

                <BuilderCard title="Button and link" hint="Where people go when they tap it">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <LabelRow label="Link" optional />
                            <input className={fieldCls} value={form.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://… or /concertzone" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                            {err('link')}
                        </label>
                        <Field label="Button text">
                            <input className={fieldCls} value={form.buttonText} onChange={(e) => set({ buttonText: e.target.value })} placeholder="Read more" />
                        </Field>
                    </div>
                </BuilderCard>

                <BuilderCard title="Image" hint="Used in the notification and on the card">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <ImagePicker value={form.image} onChange={(url) => set({ image: url })} optional label="Picture" aspect="aspect-[16/9]" />
                        {form.image ? <FramingControls value={form.imageTransform} onChange={(t) => set({ imageTransform: t })} /> : <p className="text-[12px] text-gray-500 sm:pt-7">Add a picture to adjust how it's framed.</p>}
                    </div>
                </BuilderCard>

                <BuilderCard title="Where and when" hint="The website shows one banner: the top pinned announcement that is live">
                    <div className="space-y-4">
                        <Toggle label="Show in the website banner" hint="Pins it to the top of every page until it ends or you unpin it" checked={form.isPinned} onChange={(v) => set({ isPinned: v })} />
                        <div>
                            <span className="mb-1 block text-[12px] font-bold text-gray-500">Starts</span>
                            <Choice value={form.startMode} onChange={(v) => set({ startMode: v })} options={[{ value: 'now', label: 'Right away' }, { value: 'later', label: 'Schedule', hint: 'Pick a date and time' }]} />
                            {form.startMode === 'later' && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <input type="date" className={fieldCls} value={form.startDate} min={todayInput()} onChange={(e) => set({ startDate: e.target.value })} aria-label="Start date" />
                                    <input type="time" className={fieldCls} value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} aria-label="Start time" />
                                </div>
                            )}
                            {err('start')}
                        </div>
                        <div>
                            <span className="mb-1 block text-[12px] font-bold text-gray-500">Ends</span>
                            <Choice value={form.endMode} onChange={(v) => set({ endMode: v })} options={[{ value: 'never', label: 'Keep showing' }, { value: 'until', label: 'On a date', hint: 'Hides it after that' }]} />
                            {form.endMode === 'until' && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <input type="date" className={fieldCls} value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} aria-label="End date" />
                                    <input type="time" className={fieldCls} value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} aria-label="End time" />
                                </div>
                            )}
                            {err('end')}
                            {!problems.end && endPassed && <p className="mt-1 text-[12px] font-semibold text-amber-600 dark:text-amber-400">That date has passed, so this won't show on the site.</p>}
                        </div>
                    </div>
                </BuilderCard>

                <BuilderCard title="Tell people" hint="Goes to everyone with the app or site open, and as a phone notification">
                    {canNotify ? (
                        <div className="space-y-3">
                            {editing?.notifiedAt && !form.forceNotify ? (
                                <div className="rounded-xl bg-black/[0.03] p-3 text-[13px] text-gray-600 dark:bg-white/[0.04] dark:text-zinc-300">
                                    Everyone was notified {formatDayTime(editing.notifiedAt)}{editing.notifyCount > 1 ? ` (${editing.notifyCount} times)` : ''}.
                                    <button type="button" onClick={() => set({ forceNotify: true, notifyPush: true })} className="ml-1 font-semibold text-amber-600 dark:text-amber-300">Notify again</button>
                                </div>
                            ) : (
                                <>
                                    <Toggle label={editing ? 'Send a notification when I save' : 'Notify everyone'} hint="In-app and phone notification" checked={form.notifyPush} onChange={(v) => set({ notifyPush: v, notifyEmail: v ? form.notifyEmail : false })} />
                                    <Toggle label="Also email all registered users" hint="Use for big news only" checked={form.notifyEmail} onChange={(v) => set({ notifyEmail: v, notifyPush: v ? true : form.notifyPush })} />
                                    {form.forceNotify && <p className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">This will notify everyone again.</p>}
                                </>
                            )}
                        </div>
                    ) : (
                        <p className="text-[13px] text-gray-500">
                            {scheduled
                                ? 'Notifications go out the moment you send them, so they are off for scheduled announcements. Once it starts, use "Send notification" on its card.'
                                : "It has ended, so there's nothing to notify about."}
                        </p>
                    )}
                </BuilderCard>

                <BuilderCard title="Preview" hint="What people will see">
                    <AnnouncementPreview data={form} />
                </BuilderCard>
            </div>
        </Sheet>
    );
};

/** The website banner and the phone notification, drawn the way they appear. */
export const AnnouncementPreview = ({ data }) => (
    <div className="space-y-4">
        <div>
            <p className="mb-1.5 text-[12px] font-bold text-gray-500">Website banner {!data.isPinned && <Badge tone="gray" className="ml-1">Not pinned</Badge>}</p>
            <div className={cn('flex h-11 items-center gap-2 overflow-hidden rounded-xl border border-black/[0.06] bg-white px-3 dark:border-white/[0.08] dark:bg-[#0b0d12]', !data.isPinned && 'opacity-50')}>
                <p className="flex min-w-0 flex-1 items-center justify-center gap-2 text-[12.5px]">
                    <Megaphone size={14} className="shrink-0 text-emerald-600 dark:text-neon-green" />
                    <span className="min-w-0 truncate">
                        <span className="font-semibold text-gray-900 dark:text-white">{data.title || 'Your headline'}</span>
                        {data.content && <span className="text-gray-500"> · {data.content}</span>}
                    </span>
                    {data.link && <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-emerald-700 dark:text-neon-green">{data.buttonText || 'Read more'} <ArrowRight size={12} /></span>}
                </p>
                <X size={14} className="shrink-0 text-gray-400" />
            </div>
        </div>
        <div>
            <p className="mb-1.5 text-[12px] font-bold text-gray-500">Notification</p>
            <div className="flex gap-3 rounded-2xl border border-black/[0.06] bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-neon-green"><Bell size={17} /></span>
                <div className="min-w-0 flex-1">
                    <p className="flex items-center justify-between gap-2 text-[11px] text-gray-500"><span>Newbi</span><span>now</span></p>
                    <p className="truncate text-[14px] font-bold text-gray-900 dark:text-white">{data.title || 'Your headline'}</p>
                    <p className="line-clamp-2 text-[13px] text-gray-600 dark:text-zinc-400">{data.content || 'Your message'}</p>
                </div>
                {data.image && <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg"><span className="block h-full w-full" style={framedBackground(data.image, data.imageTransform)} /></span>}
            </div>
        </div>
    </div>
);

export default AnnouncementComposer;
