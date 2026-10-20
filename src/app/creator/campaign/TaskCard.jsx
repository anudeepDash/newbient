import React, { useMemo, useState } from 'react';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Video from 'lucide-react/dist/esm/icons/video';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Upload from 'lucide-react/dist/esm/icons/upload';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import { cn } from '../../../lib/utils';
import { copyToClipboard } from '../../../lib/clipboard';
import { isPresent } from '../../../lib/present';
import { isRequiredTask, isTaskOpen } from '../../../lib/creator/tasks';
import { cleanTaskDescription, extractTaskActionLinks, linkifyContent } from '../../../lib/taskLinks';
import TaskLinks from './TaskLinks';
import { Button } from '../../../components/app';
import { dueLabel } from '../format';
import { ToneChip } from '../ui';
import { useT } from '../../../i18n';

/*
 * One deliverable: what to make, its links, and (for shortlisted creators) its status and submit buttons.
 * A deliverable with a Google Form shows the form and "Mark as submitted" to shortlisted creators only;
 * everyone else sees what to make, not where to send it.
 */

const TYPES = {
    content_post: { label: 'Feed post', icon: Camera },
    story: { label: 'Story', icon: Eye },
    reel: { label: 'Reel', icon: Video },
    visit_event: { label: 'Event visit', icon: MapPin },
};

const typeOf = (task) => {
    const kind = String(task?.taskType || '').toLowerCase();
    if (TYPES[kind]) return TYPES[kind];
    const title = String(task?.title || '').toLowerCase();
    if (/reel|short|video/.test(title)) return TYPES.reel;
    if (/stor(y|ies)/.test(title)) return TYPES.story;
    if (/post|photo|feed/.test(title)) return TYPES.content_post;
    if (/event|visit|attend/.test(title)) return TYPES.visit_event;
    return null;
};

const STATUS = {
    submitted: { label: 'In review', tone: 'blue' },
    approved: { label: 'Approved', tone: 'green' },
    rejected: { label: 'Changes needed', tone: 'amber' },
};

export const hasSubmitForm = (task) => /^https?:\/\//i.test(String(task?.googleFormLink || '').trim());

const TaskCard = ({ task, index, status, submission, canSubmit, onSubmit, onMarkSubmitted, marking, highlight }) => {
    const t = useT();
    const required = isRequiredTask(task);
    const type = typeOf(task);
    // The team opens deliverables one at a time: until then it's shown, but can't be sent yet.
    const opensSoon = !isTaskOpen(task) && status !== 'submitted' && status !== 'approved';
    const canSend = canSubmit && !opensSoon;
    const allLinks = useMemo(() => extractTaskActionLinks(task), [task]);
    const links = useMemo(() => (canSend ? allLinks : allLinks.filter(l => l.type !== 'google_form')), [allLinks, canSend]);
    const withForm = canSend && hasSubmitForm(task);
    const description = useMemo(() => {
        const cleaned = cleanTaskDescription(task.description || '', allLinks);
        return isPresent(cleaned?.replace(/<[^>]+>/g, '')) ? linkifyContent(cleaned) : null;
    }, [task.description, allLinks]);
    const meta = STATUS[status];
    const caption = String(task.captionScript || '').trim();
    const [copied, setCopied] = useState(false);
    const copyCaption = () => copyToClipboard(caption).then(ok => { if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); } });
    const due = dueLabel(task.deadline);

    // One quiet line: what it is and when. "Required" is the norm, so only "Optional" is said.
    const line = [type ? t(type.label) : null, due, required ? null : t('Optional')].filter(Boolean).join(' · ');

    return (
        <li
            id={`task-${task.id}`}
            className={cn(
                'scroll-mt-24 space-y-3 rounded-2xl bg-white/60 p-3.5 ring-1 ring-inset dark:bg-white/[0.04]',
                highlight ? 'ring-2 ring-emerald-500/50 dark:ring-neon-green/50' : 'ring-black/[0.06] dark:ring-white/[0.08]'
            )}
        >
            {/* Icon · what and when · status · the link, on one row. */}
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green">
                    {type ? <type.icon size={18} /> : <span className="text-[14px] font-black">{index + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-bold leading-snug">{isPresent(task.title) ? task.title : t('Deliverable {n}', { n: index + 1 })}</h3>
                    {line && <p className="mt-0.5 truncate text-[13px] text-gray-500 dark:text-zinc-400">{line}</p>}
                </div>
                {opensSoon
                    ? <ToneChip tone="gray" className="shrink-0">{t('Opens soon')}</ToneChip>
                    : meta && <ToneChip tone={meta.tone} className="shrink-0">{t(meta.label)}</ToneChip>}
                {links.length === 1 && <TaskLinks links={links} compact className="shrink-0" />}
            </div>

            {/* The deliverable's own brief, caption and extra links, lined up under the title. */}
            {(description || caption || links.length > 1) && (
                <div className="space-y-3 pl-[3.25rem]">
                    {description && <div className="nb-brief nb-brief-sm break-words" dangerouslySetInnerHTML={{ __html: description }} />}
                    {caption && (
                        <div className="rounded-xl bg-black/[0.04] px-3 py-2.5 dark:bg-white/[0.05]">
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">{t('Caption to use')}</span>
                                <button type="button" onClick={copyCaption} className="text-[12px] font-bold text-emerald-700 dark:text-neon-green">{copied ? t('Copied') : t('Copy')}</button>
                            </div>
                            <p className="whitespace-pre-line text-[14px] text-gray-800 dark:text-zinc-200">{caption}</p>
                        </div>
                    )}
                    {links.length > 1 && <TaskLinks links={links} />}
                </div>
            )}

            {status === 'rejected' && isPresent(submission?.rejectionReason) && (
                <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-200">{submission.rejectionReason}</p>
            )}
            {isPresent(submission?.contentLink) && /^https?:/.test(submission.contentLink) && (
                <a href={submission.contentLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-emerald-700 dark:text-neon-green">
                    <ExternalLink size={13} className="shrink-0" /> <span className="truncate">{submission.contentLink}</span>
                </a>
            )}

            {canSubmit && opensSoon && (
                <p className="pl-[3.25rem] text-[13px] text-gray-500 dark:text-zinc-400">{t('Not open for submissions yet. We’ll let you know when to post this one.')}</p>
            )}
            {canSend && status !== 'approved' && (
                withForm ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {status !== 'submitted' && (
                            <Button size="sm" icon={CircleCheck} loading={marking} onClick={() => onMarkSubmitted?.(task)}>
                                {status === 'rejected' ? t('Mark as resubmitted') : t('Mark as submitted')}
                            </Button>
                        )}
                        <Button size="sm" variant="secondary" icon={Upload} onClick={() => onSubmit(task)}>
                            {status === 'submitted' ? t('Add a link or screenshot') : t('Send a link instead')}
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant={status === 'not_started' || status === 'rejected' ? 'primary' : 'secondary'}
                        size="sm"
                        icon={Upload}
                        onClick={() => onSubmit(task)}
                    >
                        {status === 'rejected' ? t('Resubmit') : status === 'submitted' ? t('Update submission') : t('Submit')}
                    </Button>
                )
            )}
        </li>
    );
};

export default TaskCard;
