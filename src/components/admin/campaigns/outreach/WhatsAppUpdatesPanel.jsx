import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Send from 'lucide-react/dist/esm/icons/send';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import FilePen from 'lucide-react/dist/esm/icons/file-pen';
import Users from 'lucide-react/dist/esm/icons/users';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import Hand from 'lucide-react/dist/esm/icons/hand';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import Zap from 'lucide-react/dist/esm/icons/zap';
import DoorOpen from 'lucide-react/dist/esm/icons/door-open';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button, Card, Badge, Select, SearchInput } from '../../ui';
import { Field, fieldCls } from '../../uploads/UploadKit';
import { Spinner, ConfirmSheet } from '../parts';
import { isOnShortlist } from '../../../../lib/outreach/status';
import { renderTemplatePreview, WA_TEMPLATES, JOIN_BUTTON, STOP_BUTTON, INTERESTED_BUTTON, JOIN_GROUP_BUTTON, groupCodeOf } from '../../../../lib/outreach/whatsappTemplate';
import { briefLine, linksLine, taskLinksOf } from '../../../../lib/outreach/taskBrief';
import { formatDeadline } from '../../../../lib/outreach/template';
import { taskWindow } from '../../../../lib/creator/tasks';
import { callOutreach } from './outreachApi';
import { StatusBadge, Handle, SKIP_REASON, Bubble } from './parts';
import CampaignOpenPanel from './CampaignOpenPanel';

/*
 * Outreach → WhatsApp: the team picks a message, who gets it, and sends it
 * through the WhatsApp API (api/_lib/outreachBroadcast.js). The queue keeps to
 * the rate limit, retries, and skips anyone who replied STOP. Each message is
 * a Meta template, so it goes out only once Meta approved it and its switch
 * is on; until then it shows as "Waiting for Meta".
 *
 * Below the composer: the messages that go out by themselves, and whether each
 * one is switched on.
 */

const MESSAGES = [
    { kind: 'campaign_open', label: 'Campaign open', icon: DoorOpen, tone: 'blue', hint: 'Registered creators who match', segments: [] },
    { kind: 'task_live', label: 'Task is live', icon: ClipboardList, tone: 'green', hint: 'The brief, links and due date', segments: ['owes', 'approved'] },
    { kind: 'brief_changed', label: 'Brief changed', icon: FilePen, tone: 'amber', hint: 'What changed, with their task link', segments: ['approved', 'owes'] },
    { kind: 'group', label: 'Group invite', icon: Users, tone: 'violet', hint: 'A Join the group button, then Joined', segments: ['not_joined', 'approved'] },
    { kind: 'update', label: 'Update', icon: Megaphone, tone: 'blue', hint: 'A short note and a link', segments: ['approved', 'not_joined'] },
    { kind: 'event_day', label: 'Event day', icon: CalendarClock, tone: 'pink', hint: 'When, where, what to bring', segments: ['approved'] },
    { kind: 'reach_out', label: 'First reach-out', icon: Hand, tone: 'teal', hint: 'For imported numbers', segments: ['imported_new', 'imported', 'applied'] },
    { kind: 'not_selected', label: 'Not picked', icon: HeartHandshake, tone: 'gray', hint: 'Close the loop with applicants', segments: ['applied'] },
];

const SEGMENTS = {
    approved: { label: 'Every approved creator', test: (a) => isOnShortlist(a.status) },
    not_joined: { label: 'Approved, not in the group yet', test: (a) => isOnShortlist(a.status) && !a.joinedAt && a.status !== 'joined' && !['posted', 'paid'].includes(a.status) },
    owes: { label: 'Approved, haven’t sent this post', test: (a, ctx) => isOnShortlist(a.status) && a.status !== 'paid' && !['submitted', 'approved'].includes(a.deliverables?.[String(ctx.task?.id)]?.status) },
    applied: { label: 'Applicants not shortlisted', test: (a) => (a.status || 'applied') === 'applied' },
    imported_new: { label: 'Imported, not messaged yet', test: (a) => a.source === 'import' && !a.reachedOutAt && a.status !== 'removed' },
    imported: { label: 'Everyone imported', test: (a) => a.source === 'import' && a.status !== 'removed' },
};

// The messages that go out without anyone pressing send, in the order a campaign meets them.
const AUTOMATIC = [
    { kind: 'welcome_city', label: 'Welcome + city community', when: 'When someone registers on the creator portal (once)' },
    { kind: 'city_group', label: 'City community', when: 'When someone applies' },
    { kind: 'invite', label: 'Shortlist invite', when: 'When you shortlist someone' },
    { kind: 'reminder', label: 'Join reminder', when: '48 h later, if they haven’t joined' },
    { kind: 'task_live', label: 'Task is live', when: 'When you open a task, to every approved creator' },
    { kind: 'posts_open', label: 'Post date set', when: 'The day before a task’s “Opens on” date' },
    { kind: 'post_due', label: 'Post due tomorrow', when: 'The day before a deadline' },
    { kind: 'post_overdue', label: 'Post overdue', when: 'The day after a missed deadline' },
    { kind: 'changes', label: 'Changes needed', when: 'When you ask for changes on a post' },
    { kind: 'all_approved', label: 'All posts approved', when: 'When their last post is approved' },
    { kind: 'payout', label: 'Payout sent', when: 'When you record their payout' },
    { kind: 'feedback', label: 'Feedback request', when: 'The day after the event' },
];

const SKIPPED = { ...SKIP_REASON, not_approved: 'not on the shortlist', not_applicant: 'already shortlisted', no_phone: 'no WhatsApp number', posts_in: 'already sent this post', already_sent: 'already got it', not_found: 'not found' };

const dueOf = (task, campaign) => {
    const day = String(task?.deadline || campaign?.postingDeadline || '').slice(0, 10);
    return day ? formatDeadline(day) || day : 'No fixed date';
};

const buttonsOf = (kind) => {
    if (kind === 'group_invite') return [`↗ ${JOIN_GROUP_BUTTON}`, JOIN_BUTTON, STOP_BUTTON];
    if (['group_link', 'group_join'].includes(kind)) return [JOIN_BUTTON, STOP_BUTTON];
    if (kind === 'reach_out') return [INTERESTED_BUTTON, STOP_BUTTON];
    if (['update', 'not_selected'].includes(kind)) return [STOP_BUTTON];
    return WA_TEMPLATES[kind]?.button ? [`↗ ${WA_TEMPLATES[kind].button}`] : [];
};

const WhatsAppUpdatesPanel = ({ campaign, applications, settings, api, onSent }) => {
    const addToast = useStore(s => s.addToast);
    const live = (k) => Boolean(api?.configured && api?.templates?.[k]);
    // The invite with a "Join the group" button once Meta approves it; until then whichever older one is on (link in the text).
    const groupKind = live('group_invite') ? 'group_invite' : live('group_join') ? 'group_join' : live('group_link') ? 'group_link' : 'group_invite';
    const hasImported = applications.some(a => a.source === 'import');
    const [pick, setPick] = useState(hasImported && applications.some(SEGMENTS.imported_new.test) ? 'reach_out' : 'task_live');
    const kind = pick === 'group' ? groupKind : pick;
    const meta = MESSAGES.find(m => m.kind === pick) || MESSAGES[0];

    const openTasks = useMemo(() => (campaign.tasks || []).filter(t => taskWindow(t) === 'open'), [campaign.tasks]);
    const [taskId, setTaskId] = useState(() => String(openTasks[0]?.id || ''));
    const task = openTasks.find(t => String(t.id) === taskId) || null;
    useEffect(() => { if (!task && openTasks[0]) setTaskId(String(openTasks[0].id)); }, [task, openTasks]);

    const defaultGroup = settings?.whatsappGroupLink || campaign.whatsappLink || '';
    const [fields, setFields] = useState({ groupLink: defaultGroup, joinBy: '', note: '', link: '', when: '', where: '', reward: campaign.reward || '' });
    const set = (patch) => setFields(f => ({ ...f, ...patch }));
    const [segment, setSegment] = useState(meta.segments[0] || 'approved');
    useEffect(() => { setSegment(meta.segments[0] || 'approved'); }, [pick]); // eslint-disable-line react-hooks/exhaustive-deps
    const [q, setQ] = useState('');
    const [picked, setPicked] = useState(() => new Set());
    const [confirm, setConfirm] = useState(false);
    const [sending, setSending] = useState(false);

    const reachable = useMemo(() => applications.filter(a => a.phone && !a.whatsappOptOut && a.status !== 'removed'), [applications]);
    const ctx = { task };
    const inSegment = useMemo(() => reachable.filter(a => SEGMENTS[segment]?.test(a, ctx)), [reachable, segment, task]); // eslint-disable-line react-hooks/exhaustive-deps
    const query = q.trim().toLowerCase().replace(/^@/, '');
    const shown = query ? inSegment.filter(a => `${a.fullName} ${a.instagramHandle} ${a.phone}`.toLowerCase().includes(query)) : inSegment;
    // Everyone in the chosen group is ticked until the team unticks someone.
    useEffect(() => { setPicked(new Set(inSegment.map(a => a.id))); }, [pick, segment, taskId, applications]); // eslint-disable-line react-hooks/exhaustive-deps
    const recipients = inSegment.filter(a => picked.has(a.id));
    const allShownPicked = shown.length > 0 && shown.every(a => picked.has(a.id));

    const httpsOk = (v) => /^https:\/\/\S+$/.test(String(v || '').trim());
    const one = (v) => String(v || '').replace(/\s+/g, ' ').trim();
    const data = {
        task_live: task ? { taskTitle: task.title || 'Deliverable', details: briefLine(task), links: linksLine(taskLinksOf(task)), dueAt: dueOf(task, campaign) } : null,
        group_link: { link: fields.groupLink.trim() },
        group_join: { link: fields.groupLink.trim(), joinBy: one(fields.joinBy) },
        group_invite: { link: fields.groupLink.trim(), joinBy: one(fields.joinBy) },
        update: { note: one(fields.note), link: fields.link.trim() },
        brief_changed: { note: one(fields.note) },
        event_day: { when: one(fields.when), where: one(fields.where), note: one(fields.note) },
        reach_out: { reward: one(fields.reward) },
        not_selected: {},
    }[kind];
    const missing = {
        task_live: !task && 'Open a task in Deliverables first.',
        group_link: !httpsOk(fields.groupLink) && 'Paste the group link (https://chat.whatsapp.com/…).',
        group_join: !httpsOk(fields.groupLink) && 'Paste the group link (https://chat.whatsapp.com/…).',
        group_invite: !groupCodeOf(fields.groupLink) && 'Paste the group’s invite link (https://chat.whatsapp.com/…).',
        update: (!one(fields.note) && 'Write the update.') || (!httpsOk(fields.link) && 'Add a link starting with https://'),
        brief_changed: !one(fields.note) && 'Say what changed in the brief.',
        event_day: (!one(fields.when) || !one(fields.where)) && 'Add when and where.',
        reach_out: false,
        not_selected: false,
    }[kind];
    const sample = recipients[0] || inSegment[0];
    const preview = data ? renderTemplatePreview(kind, { application: sample || { fullName: 'Riya' }, campaign, groupLink: defaultGroup, data }) : '';
    const isLive = live(kind);
    const canSend = isLive && !missing && recipients.length > 0 && !sending;

    const sendNow = async () => {
        setSending(true);
        const r = await callOutreach('outreach-wa-send', {
            campaignId: campaign.id, kind, appIds: recipients.map(a => a.id),
            ...(kind === 'task_live' ? { taskId } : data),
        });
        setSending(false);
        setConfirm(false);
        if (!r.ok) { addToast(r.error || 'Please try again.', 'error', { title: 'Not sent' }); return; }
        const skipped = r.data.skipped || [];
        const why = [...new Set(skipped.map(s => SKIPPED[s.reason] || s.reason))].join(', ');
        addToast(
            `${r.data.queued} queued${skipped.length ? `, ${skipped.length} skipped (${why})` : ''}. They go out a few a minute; follow them in Inbox or the WhatsApp page → Sent.`,
            r.data.queued ? 'success' : 'warning',
            { title: `${meta.label} on WhatsApp` },
        );
        onSent?.();
    };

    const counts = Object.fromEntries(Object.keys(SEGMENTS).map(k => [k, reachable.filter(a => SEGMENTS[k].test(a, ctx)).length]));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MESSAGES.map(m => {
                    const k = m.kind === 'group' ? groupKind : m.kind;
                    const on = pick === m.kind;
                    return (
                        <button
                            key={m.kind}
                            type="button"
                            onClick={() => setPick(m.kind)}
                            aria-pressed={on}
                            className={cn(
                                'flex flex-col gap-1.5 rounded-2xl border p-3 text-left transition-all',
                                on ? 'border-emerald-500/60 bg-neon-green/[0.08] shadow-sm dark:border-neon-green/50' : 'border-black/[0.06] bg-white hover:-translate-y-0.5 hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20',
                            )}
                        >
                            <span className="flex items-center justify-between gap-2">
                                <Badge tone={m.tone} className="!p-1.5"><m.icon size={14} /></Badge>
                                <span className={cn('h-2 w-2 rounded-full', live(k) ? 'bg-emerald-500' : 'bg-amber-400')} title={live(k) ? 'Switched on' : 'Waiting for Meta'} />
                            </span>
                            <span className="text-[13px] font-bold leading-tight">{m.label}</span>
                            <span className="text-[11.5px] leading-snug text-gray-500">{m.hint}</span>
                        </button>
                    );
                })}
            </div>

            {pick === 'campaign_open' ? <CampaignOpenPanel campaign={campaign} live={live('campaign_open')} /> : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
                <Card className="min-w-0 space-y-5 p-4">
                    {!api?.configured && <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] font-medium text-amber-700 dark:text-amber-300"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> The WhatsApp API isn’t set up yet.</p>}
                    {api?.configured && !isLive && (
                        <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] font-medium text-amber-700 dark:text-amber-300">
                            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                            <span><strong>{WA_TEMPLATES[kind]?.name}</strong> isn’t switched on yet. Submit it to Meta from <Link to="/admin/whatsapp" className="underline">WhatsApp → Templates</Link>; once Meta approves it, turn on its setting in Vercel and it can be sent from here.</span>
                        </p>
                    )}

                    {kind === 'task_live' && (openTasks.length ? (
                        <Field label="Task" hint="Only open tasks. Opening a task sends this by itself to every approved creator who hasn’t had it; use this to send it again or to people added later.">
                            <Select label="Task" value={taskId} onChange={setTaskId} className="w-full" options={openTasks.map(t => ({ value: String(t.id), label: t.title || 'Deliverable' }))} />
                        </Field>
                    ) : <p className="text-[13px] text-gray-500">No task is open. Open one in the Deliverables tab, and its brief goes out on WhatsApp by itself.</p>)}
                    {['group_link', 'group_join', 'group_invite'].includes(kind) && (
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                            <Field label="Group link" hint={kind === 'group_invite' ? 'This campaign’s group from Settings, or paste another. It opens from the “Join the group” button, not as a link in the text. Tapping “Joined” marks them joined here.' : 'This campaign’s group from Settings, or paste another. Tapping “Joined” marks them joined here.'}>
                                <input className={fieldCls} value={fields.groupLink} onChange={(e) => set({ groupLink: e.target.value })} placeholder="https://chat.whatsapp.com/…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                            </Field>
                            {(kind === 'group_join' || kind === 'group_invite') && (
                                <Field label="Join by" optional>
                                    <input className={fieldCls} value={fields.joinBy} onChange={(e) => set({ joinBy: e.target.value })} maxLength={60} placeholder="Sat, 14 Nov" />
                                </Field>
                            )}
                        </div>
                    )}
                    {(kind === 'update' || kind === 'brief_changed') && (
                        <Field label={kind === 'update' ? 'Update' : 'What changed'} hint={`One short paragraph (WhatsApp turns line breaks into spaces here). ${400 - fields.note.length} characters left.`}>
                            <textarea className={cn(fieldCls, 'h-auto py-3')} rows={3} maxLength={400} value={fields.note} onChange={(e) => set({ note: e.target.value })} placeholder={kind === 'update' ? 'e.g. Your passes are at the box office from 3 PM on the 19th. Carry a photo ID.' : 'e.g. Use the new audio from the group, and tag @pinnaca.in in the caption.'} />
                        </Field>
                    )}
                    {kind === 'update' && (
                        <Field label="Link">
                            <input className={fieldCls} value={fields.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                        </Field>
                    )}
                    {kind === 'event_day' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="When"><input className={fieldCls} value={fields.when} onChange={(e) => set({ when: e.target.value })} maxLength={80} placeholder="Sat, 19 Dec, 2:00 PM" /></Field>
                            <Field label="Where"><input className={fieldCls} value={fields.where} onChange={(e) => set({ where: e.target.value })} maxLength={140} placeholder="Ekana Stadium, Gate 3" /></Field>
                            <Field label="Note" optional className="sm:col-span-2"><input className={fieldCls} value={fields.note} onChange={(e) => set({ note: e.target.value })} maxLength={200} placeholder="Carry a photo ID and come with your phone charged" /></Field>
                        </div>
                    )}
                    {kind === 'reach_out' && (
                        <Field label="What they get" optional hint="One line. Left empty, it says “Details in the next message”. Tapping “I’m interested” marks them Interested here; reply to them from Inbox.">
                            <input className={fieldCls} value={fields.reward} onChange={(e) => set({ reward: e.target.value })} maxLength={160} placeholder="Free passes for you and a friend, and ₹2,000 per reel" />
                        </Field>
                    )}
                    {kind === 'not_selected' && <p className="text-[13px] text-gray-500">Sent to applicants you didn’t shortlist, so nobody is left waiting. Each person gets it once.</p>}

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="mr-auto text-[13px] font-bold">Send to</h4>
                            <Select label="Who" value={segment} onChange={setSegment} options={meta.segments.filter(s => s !== 'owes' || task).map(s => ({ value: s, label: `${SEGMENTS[s].label} (${counts[s]})` }))} />
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
                            <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-3 py-2 dark:border-white/[0.06]">
                                <label className="flex items-center gap-2.5 text-[12px] font-semibold text-gray-500">
                                    <input type="checkbox" checked={allShownPicked} onChange={() => setPicked(s => { const n = new Set(s); shown.forEach(a => (allShownPicked ? n.delete(a.id) : n.add(a.id))); return n; })} className="h-4 w-4 accent-emerald-600" />
                                    {recipients.length} of {inSegment.length} picked
                                </label>
                                {inSegment.length > 8 && <SearchInput value={q} onChange={setQ} placeholder="Find someone" className="ml-auto w-full sm:w-48" />}
                            </div>
                            {shown.length ? (
                                <ul className="max-h-80 divide-y divide-black/[0.05] overflow-y-auto dark:divide-white/[0.06]">
                                    {shown.map(a => (
                                        <li key={a.id}>
                                            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                                                <input type="checkbox" checked={picked.has(a.id)} onChange={() => setPicked(s => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })} className="h-4 w-4 accent-emerald-600" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13.5px] font-semibold">{a.fullName}</span>
                                                    <span className="block truncate text-[12px] text-gray-500">{a.instagramHandle ? <><Handle handle={a.instagramHandle} /> · </> : null}{a.phone}</span>
                                                </span>
                                                {a.interestedAt && <Badge tone="teal">Interested</Badge>}
                                                {a.source === 'import' && !a.interestedAt && <Badge tone="gray">Imported</Badge>}
                                                <StatusBadge status={a.status} />
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="px-4 py-6 text-center text-[13px] text-gray-500">{inSegment.length ? 'Nobody matches that search.' : pick === 'reach_out' ? 'No imported numbers yet. Use Import a sheet on the People tab.' : 'Nobody in this group yet.'}</p>
                            )}
                        </div>
                        {applications.some(a => a.whatsappOptOut || !a.phone) && <p className="text-[11.5px] text-gray-500">People with no WhatsApp number, or who replied STOP, aren’t listed.</p>}
                    </div>
                </Card>

                <div className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
                    <Card className="space-y-3 p-4">
                        <p className="text-[12px] font-bold text-gray-500">What {sample ? (sample.fullName || '').split(' ')[0] || 'they' : 'they'} will get</p>
                        {preview ? <Bubble text={preview} image={campaign.image || campaign.coverImage || campaign.bannerImage || campaign.thumbnail} buttons={buttonsOf(kind)} /> : <p className="text-[13px] text-gray-500">Pick a task to see the message.</p>}
                        {missing && <p className="text-[12.5px] font-semibold text-amber-600 dark:text-amber-300">{missing}</p>}
                        <Button variant="success" className="h-11 w-full" disabled={!canSend} onClick={() => setConfirm(true)}>
                            {sending ? <Spinner /> : <Send size={14} />} {!isLive ? 'Waiting for Meta approval' : recipients.length ? `Send to ${recipients.length}` : 'Nobody picked'}
                        </Button>
                    </Card>
                </div>
            </div>
            )}

            <Card className="p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Zap size={15} className="text-amber-500" />
                    <h4 className="mr-auto text-[14px] font-bold">Goes out by itself</h4>
                    <span className="flex items-center gap-1.5 text-[11.5px] text-gray-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> On <span className="ml-2 h-2 w-2 rounded-full bg-amber-400" /> Waiting for Meta</span>
                </div>
                <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
                    {AUTOMATIC.map(a => (
                        <li key={a.kind} className="flex items-start gap-2.5 py-1.5">
                            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', live(a.kind) ? 'bg-emerald-500' : 'bg-amber-400')} />
                            <span className="min-w-0">
                                <span className="block text-[13px] font-semibold">{a.label}</span>
                                <span className="block text-[11.5px] leading-snug text-gray-500">{a.when}</span>
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-[11.5px] text-gray-500">Submit waiting templates from <Link to="/admin/whatsapp" className="underline">WhatsApp → Templates</Link>.</p>
            </Card>

            <ConfirmSheet
                open={confirm}
                onClose={() => setConfirm(false)}
                title={`Send to ${recipients.length} on WhatsApp?`}
                message="Each person gets this message from the Newbi WhatsApp number. It can’t be taken back once it’s sent."
                confirmLabel={sending ? 'Sending…' : `Send to ${recipients.length}`}
                onConfirm={sendNow}
            />
        </div>
    );
};

export default WhatsAppUpdatesPanel;
