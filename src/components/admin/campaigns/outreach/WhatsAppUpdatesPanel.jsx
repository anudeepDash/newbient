import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Send from 'lucide-react/dist/esm/icons/send';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Users from 'lucide-react/dist/esm/icons/users';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button, Card, EmptyState, Select } from '../../ui';
import { Choice, Field, fieldCls } from '../../uploads/UploadKit';
import { Spinner, ConfirmSheet } from '../parts';
import { isOnShortlist } from '../../../../lib/outreach/status';
import { renderTemplatePreview } from '../../../../lib/outreach/whatsappTemplate';
import { briefLine, linksLine, taskLinksOf } from '../../../../lib/outreach/taskBrief';
import { formatDeadline } from '../../../../lib/outreach/template';
import { taskWindow } from '../../../../lib/creator/tasks';
import { callOutreach } from './outreachApi';
import { StatusBadge, Handle, SKIP_REASON } from './parts';

/*
 * Outreach → Send on WhatsApp: a live task's brief, the group link, or an
 * update with a link, to approved creators (shortlisted onwards), through the
 * WhatsApp API (api/_lib/outreachBroadcast.js). The queue keeps to the rate
 * limit and skips anyone who replied STOP. Opening a task sends its brief by
 * itself; this is for sending it again, or to people added later.
 */

const KINDS = [
    { value: 'task_live', label: 'Task brief', icon: ClipboardList, hint: 'What to do, links, due date' },
    { value: 'group_link', label: 'Group link', icon: Users, hint: 'With a Joined button' },
    { value: 'update', label: 'Update', icon: Megaphone, hint: 'A short note and a link' },
];

const SKIPPED = { ...SKIP_REASON, not_approved: 'not on the shortlist', no_phone: 'no WhatsApp number', posts_in: 'already sent this post', already_sent: 'already got it', not_found: 'not found' };

const dueOf = (task, campaign) => {
    const day = String(task?.deadline || campaign?.postingDeadline || '').slice(0, 10);
    return day ? formatDeadline(day) || day : 'No fixed date';
};

const WhatsAppUpdatesPanel = ({ campaign, applications, settings, api, onSent }) => {
    const addToast = useStore(s => s.addToast);
    const [kind, setKind] = useState('task_live');
    const openTasks = useMemo(() => (campaign.tasks || []).filter(t => taskWindow(t) === 'open'), [campaign.tasks]);
    const [taskId, setTaskId] = useState(() => String(openTasks[0]?.id || ''));
    const defaultGroup = settings?.whatsappGroupLink || campaign.whatsappLink || '';
    const [groupLink, setGroupLink] = useState(defaultGroup);
    const [note, setNote] = useState('');
    const [link, setLink] = useState('');
    const [who, setWho] = useState('owes');
    // A task goes to who still owes that post; a group link or update to everyone approved.
    useEffect(() => { setWho(kind === 'task_live' ? 'owes' : 'all'); }, [kind]);
    const [picked, setPicked] = useState(() => new Set());
    const [confirm, setConfirm] = useState(false);
    const [sending, setSending] = useState(false);

    const task = openTasks.find(t => String(t.id) === taskId) || null;
    useEffect(() => { if (!task && openTasks[0]) setTaskId(String(openTasks[0].id)); }, [task, openTasks]);

    const approved = useMemo(() => applications.filter(a => isOnShortlist(a.status) && a.phone && !a.whatsappOptOut), [applications]);
    const owesTask = (a) => !['submitted', 'approved'].includes(a.deliverables?.[String(task?.id)]?.status);
    const notJoined = (a) => !a.joinedAt && a.status !== 'joined';
    const groups = {
        all: approved,
        not_joined: approved.filter(notJoined),
        owes: task ? approved.filter(owesTask) : [],
    };
    const audience = (kind === 'task_live' && who === 'not_joined') || (kind !== 'task_live' && who === 'owes') ? 'all' : who;
    const shown = groups[audience] || approved;
    // Everyone in the chosen group is ticked until the team unticks someone.
    useEffect(() => { setPicked(new Set(shown.map(a => a.id))); }, [kind, audience, taskId, applications]); // eslint-disable-line react-hooks/exhaustive-deps
    const recipients = shown.filter(a => picked.has(a.id));
    const allPicked = shown.length > 0 && recipients.length === shown.length;

    const live = Boolean(api?.configured && api?.templates?.[kind]);
    const data = kind === 'task_live'
        ? (task ? { taskTitle: task.title || 'Deliverable', details: briefLine(task), links: linksLine(taskLinksOf(task)), dueAt: dueOf(task, campaign) } : null)
        : kind === 'group_link' ? { link: groupLink.trim() } : { note: note.replace(/\s+/g, ' ').trim(), link: link.trim() };
    const sample = recipients[0] || approved[0];
    const preview = data ? renderTemplatePreview(kind, { application: sample || { fullName: 'Riya' }, campaign, groupLink: defaultGroup, data }) : '';
    const missing = kind === 'task_live' ? (!task && 'Open a task in Deliverables first.')
        : kind === 'group_link' ? (!/^https:\/\//.test(groupLink.trim()) && 'Paste the group link (https://chat.whatsapp.com/…).')
            : (!data.note && 'Write the update.') || (!/^https:\/\//.test(data.link) && 'Add a link starting with https://');
    const canSend = live && !missing && recipients.length > 0 && !sending;

    const sendNow = async () => {
        setSending(true);
        const r = await callOutreach('outreach-wa-send', {
            campaignId: campaign.id, kind, appIds: recipients.map(a => a.id),
            ...(kind === 'task_live' ? { taskId } : kind === 'group_link' ? { link: data.link } : { note: data.note, link: data.link }),
        });
        setSending(false);
        setConfirm(false);
        if (!r.ok) { addToast(r.error || 'Please try again.', 'error', { title: 'Not sent' }); return; }
        const skipped = r.data.skipped || [];
        const why = [...new Set(skipped.map(s => SKIPPED[s.reason] || s.reason))].join(', ');
        addToast(
            `${r.data.queued} queued${skipped.length ? `, ${skipped.length} skipped (${why})` : ''}. They go out a few a minute; follow them in Inbox or the WhatsApp page → Sent.`,
            r.data.queued ? 'success' : 'warning',
            { title: `${KINDS.find(k => k.value === kind).label} on WhatsApp` },
        );
        onSent?.();
    };

    if (!approved.length) {
        return <Card><EmptyState icon={Users} title="No approved creators yet" description="Add people to the shortlist first. Only approved creators with a WhatsApp number can be messaged here." /></Card>;
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <Card className="space-y-5 p-4">
                <Choice value={kind} onChange={setKind} options={KINDS.map(k => ({ value: k.value, label: k.label, hint: k.hint }))} />

                {!api?.configured && <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] font-medium text-amber-700 dark:text-amber-300"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> The WhatsApp API isn’t set up yet.</p>}
                {api?.configured && !live && (
                    <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] font-medium text-amber-700 dark:text-amber-300">
                        <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                        <span>This template isn’t switched on yet. Submit it to Meta from <Link to="/admin/whatsapp" className="underline">WhatsApp → Templates</Link>; it can be sent once Meta approves it and its setting is on in Vercel.</span>
                    </p>
                )}

                {kind === 'task_live' && (
                    openTasks.length ? (
                        <Field label="Task">
                            <Select label="Task" value={taskId} onChange={setTaskId} className="w-full" options={openTasks.map(t => ({ value: String(t.id), label: t.title || 'Deliverable' }))} />
                            <span className="mt-1 block text-[11px] leading-snug text-gray-500">Only open tasks. Opening a task sends this by itself to approved creators who haven’t had it.</span>
                        </Field>
                    ) : <p className="text-[13px] text-gray-500">No task is open. Open one in the Deliverables tab, and its brief goes out on WhatsApp by itself.</p>
                )}
                {kind === 'group_link' && (
                    <Field label="Group link">
                        <input className={fieldCls} value={groupLink} onChange={(e) => setGroupLink(e.target.value)} placeholder="https://chat.whatsapp.com/…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                        <span className="mt-1 block text-[11px] leading-snug text-gray-500">The campaign’s group from Message setup, or paste another one. “Joined” marks them joined here.</span>
                    </Field>
                )}
                {kind === 'update' && (
                    <>
                        <Field label="Update">
                            <textarea className={cn(fieldCls, 'h-auto py-3')} rows={3} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Your passes are at the box office from 3 PM on the 19th. Carry a photo ID." />
                            <span className="mt-1 block text-[11px] leading-snug text-gray-500">One short paragraph (WhatsApp turns line breaks into spaces here). {400 - note.length} characters left.</span>
                        </Field>
                        <Field label="Link">
                            <input className={fieldCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                        </Field>
                    </>
                )}

                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-[13px] font-bold">Send to</h4>
                        <Select
                            label="Who"
                            value={audience}
                            onChange={setWho}
                            options={[
                                { value: 'all', label: `Every approved creator (${groups.all.length})` },
                                ...(kind === 'task_live' && task ? [{ value: 'owes', label: `Haven’t sent this post (${groups.owes.length})` }] : []),
                                ...(kind !== 'task_live' ? [{ value: 'not_joined', label: `Not in the group yet (${groups.not_joined.length})` }] : []),
                            ]}
                        />
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
                        <label className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-2.5 text-[12px] font-semibold text-gray-500 dark:border-white/[0.06]">
                            <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(shown.map(a => a.id)))} className="h-4 w-4 accent-emerald-600" />
                            {recipients.length} of {shown.length} picked
                        </label>
                        <ul className="max-h-80 divide-y divide-black/[0.05] overflow-y-auto dark:divide-white/[0.06]">
                            {shown.map(a => (
                                <li key={a.id}>
                                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                                        <input type="checkbox" checked={picked.has(a.id)} onChange={() => setPicked(s => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })} className="h-4 w-4 accent-emerald-600" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13.5px] font-semibold">{a.fullName}</span>
                                            <span className="block truncate text-[12px] text-gray-500"><Handle handle={a.instagramHandle} /> · {a.phone}</span>
                                        </span>
                                        <StatusBadge status={a.status} />
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {applications.some(a => isOnShortlist(a.status) && (a.whatsappOptOut || !a.phone)) && (
                        <p className="text-[11.5px] text-gray-500">Approved creators with no WhatsApp number, or who replied STOP, aren’t listed.</p>
                    )}
                </div>
            </Card>

            <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
                <Card className="space-y-3 p-4">
                    <p className="text-[12px] font-bold text-gray-500">What {sample ? sample.fullName.split(' ')[0] : 'they'} will get</p>
                    {preview
                        ? <div className="whitespace-pre-wrap break-words rounded-2xl bg-emerald-500/[0.06] p-3 text-[13.5px] leading-relaxed ring-1 ring-inset ring-emerald-500/15">{preview}</div>
                        : <p className="text-[13px] text-gray-500">Pick a task to see the message.</p>}
                    {kind === 'task_live' && <p className="text-[11.5px] text-gray-500">Button: Open my task (their own page with the full brief, the links and where to send the post).</p>}
                    {kind === 'group_link' && <p className="text-[11.5px] text-gray-500">Buttons: Joined · Stop updates.</p>}
                    {missing && <p className="text-[12.5px] font-semibold text-amber-600 dark:text-amber-300">{missing}</p>}
                    <Button variant="success" className="h-11 w-full" disabled={!canSend} onClick={() => setConfirm(true)}>
                        {sending ? <Spinner /> : <Send size={14} />} {recipients.length ? `Send to ${recipients.length}` : 'Nobody picked'}
                    </Button>
                </Card>
            </div>

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
