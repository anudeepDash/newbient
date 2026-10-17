import React, { useMemo, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button, Card, Badge, EmptyState } from '../../ui';
import { fieldCls } from '../../uploads/UploadKit';
import { deliverableSummary, DELIVERABLE_STATUS } from '../../../../lib/outreach/deliverables';
import { callOutreach } from './outreachApi';
import { Handle, when } from './parts';

/*
 * Review what creators sent from their personal link: open the post or the
 * story screenshot, then Approve or Ask for changes (the reason goes to them
 * on WhatsApp with their link). Approving the last required one moves them to
 * Posted, and releases their ticket if the campaign's rule says so.
 */

const ReviewItem = ({ campaignId, app, item, onDone }) => {
    const addToast = useStore(s => s.addToast);
    const [asking, setAsking] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const { task, sub, status } = item;
    const meta = DELIVERABLE_STATUS[status];
    const review = async (decision) => {
        setBusy(true);
        const r = await callOutreach('outreach-review', { campaignId, appId: app.id, taskId: task.id, decision, reason });
        setBusy(false);
        if (!r.ok) { addToast(r.error, 'error'); return; }
        const extra = [r.data.movedTo === 'posted' && 'moved to Posted', r.data.ticket === 'released' && 'ticket sent'].filter(Boolean).join(', ');
        addToast(decision === 'approve' ? `Approved${extra ? `: ${extra}` : ''}.` : 'Changes asked. They’ll get it on WhatsApp.', 'success');
        setAsking(false);
        setReason('');
        onDone();
    };
    return (
        <div className="space-y-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[14px] font-bold">{app.fullName} <span className="font-normal text-gray-500">· <Handle handle={app.instagramHandle} /></span></p>
                    <p className="text-[13px] text-gray-500">{task.title}{task.required ? '' : ' (optional)'} · sent {when(sub?.submittedAt)}</p>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {sub?.screenshotUrl && (
                    <a href={sub.screenshotUrl} target="_blank" rel="noopener noreferrer"><img src={sub.screenshotUrl} alt={`${task.title} screenshot`} className="h-32 w-20 rounded-xl object-cover ring-1 ring-black/10" /></a>
                )}
                {sub?.link && <Button as="a" size="sm" href={sub.link} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open post</Button>}
                {sub?.note && <p className="text-[13px] text-gray-600 dark:text-zinc-400">“{sub.note}”</p>}
            </div>
            {status === 'rejected' && sub?.reason && <p className="text-[12.5px] text-gray-500">Asked: {sub.reason}</p>}
            {status === 'submitted' && !asking && (
                <div className="flex flex-wrap gap-2">
                    <Button variant="success" size="sm" disabled={busy} onClick={() => review('approve')}><Check size={14} /> Approve</Button>
                    <Button size="sm" disabled={busy} onClick={() => setAsking(true)}><Undo2 size={14} /> Ask for changes</Button>
                </div>
            )}
            {asking && (
                <div className="space-y-2">
                    <textarea className={cn(fieldCls, 'min-h-[72px] py-2')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What should they change? e.g. Add the ticket link sticker." maxLength={300} autoFocus aria-label="What to change" />
                    <div className="flex gap-2">
                        <Button variant="accent" size="sm" disabled={busy || reason.trim().length < 5} onClick={() => review('reject')}>Send to them</Button>
                        <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>Cancel</Button>
                    </div>
                </div>
            )}
            {status === 'approved' && sub?.reviewedBy && <p className="text-[12.5px] text-gray-500">Approved by {sub.reviewedBy} {when(sub.reviewedAt)}</p>}
        </div>
    );
};

const DeliverablesReview = ({ campaign, applications, onChanged }) => {
    const [show, setShow] = useState('to_review');
    const rows = useMemo(() => applications.flatMap(app => deliverableSummary(campaign, app).items
        .filter(i => i.status !== 'not_started')
        .map(i => ({ app, item: i }))), [campaign, applications]);
    const toReview = rows.filter(r => r.item.status === 'submitted');
    const list = [...(show === 'to_review' ? toReview : rows)]
        .sort((a, b) => String(b.item.sub?.submittedAt || '').localeCompare(String(a.item.sub?.submittedAt || '')));
    const tasks = (campaign.tasks || []).length;

    if (!tasks) {
        return <Card><EmptyState icon={Inbox} title="This campaign has no deliverables yet" description="Add them in Edit → Deliverables. Creators then get a personal link to send their posts." /></Card>;
    }
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {[{ value: 'to_review', label: 'To review', count: toReview.length }, { value: 'all', label: 'Everything sent', count: rows.length }].map(t => (
                    <button key={t.value} type="button" onClick={() => setShow(t.value)} className={cn('h-9 rounded-full border px-3.5 text-[13px] font-semibold', show === t.value ? 'border-transparent bg-gray-900 text-white dark:bg-white dark:text-black' : 'border-black/10 text-gray-600 dark:border-white/10 dark:text-zinc-300')}>
                        {t.label} · {t.count}
                    </button>
                ))}
            </div>
            {list.length === 0 ? (
                <Card><EmptyState icon={Inbox} title={show === 'to_review' ? 'Nothing to review' : 'Nothing sent yet'} description="Creators send posts from the personal link they get after tapping Joined (or the {submit_link} in your message)." /></Card>
            ) : (
                <Card className="divide-y divide-black/[0.05] px-4 dark:divide-white/[0.06]">
                    {list.map(({ app, item }) => <ReviewItem key={`${app.id}_${item.task.id}`} campaignId={campaign.id} app={app} item={item} onDone={onChanged} />)}
                </Card>
            )}
        </div>
    );
};

export default DeliverablesReview;
