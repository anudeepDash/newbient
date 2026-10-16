import React, { useMemo } from 'react';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Video from 'lucide-react/dist/esm/icons/video';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Layers from 'lucide-react/dist/esm/icons/layers';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import Upload from 'lucide-react/dist/esm/icons/upload';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { cn } from '../../../lib/utils';
import { isPresent } from '../../../lib/present';
import { isRequiredTask } from '../../../lib/creator/tasks';
import { cleanTaskDescription, extractTaskActionLinks, linkifyContent } from '../../../lib/taskLinks';
import TaskLinks from './TaskLinks';
import { Button } from '../../../components/app';
import { dueLabel } from '../format';
import { ToneChip } from '../ui';

/* One deliverable: what to make, its links, and (for picked creators) its status and submit button. */

const TYPES = {
    content_post: { label: 'Feed post', icon: Camera },
    story: { label: 'Story', icon: Eye },
    reel: { label: 'Reel', icon: Video },
    visit_event: { label: 'Event visit', icon: MapPin },
};

const typeOf = (task) => {
    const t = String(task?.taskType || '').toLowerCase();
    if (TYPES[t]) return TYPES[t];
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

const TaskCard = ({ task, index, status, submission, canSubmit, onSubmit, highlight }) => {
    const required = isRequiredTask(task);
    const type = typeOf(task);
    const links = useMemo(() => extractTaskActionLinks(task), [task]);
    const description = useMemo(() => {
        const cleaned = cleanTaskDescription(task.description || '', links);
        return isPresent(cleaned?.replace(/<[^>]+>/g, '')) ? linkifyContent(cleaned) : null;
    }, [task.description, links]);
    const meta = STATUS[status];
    const due = dueLabel(task.deadline);

    return (
        <li
            id={`task-${task.id}`}
            className={cn(
                'scroll-mt-24 space-y-3 rounded-3xl border bg-white p-4 dark:bg-white/[0.02]',
                highlight ? 'border-emerald-500/50 ring-2 ring-emerald-500/20 dark:border-neon-green/50' : 'border-black/[0.06] dark:border-white/[0.07]'
            )}
        >
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-[14px] font-black text-gray-600 dark:bg-white/[0.06] dark:text-zinc-300">
                    {type ? <type.icon size={16} /> : (index + 1)}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <ToneChip tone={required ? 'gray' : 'blue'}>{required ? 'Required' : 'Optional'}</ToneChip>
                        {type && <ToneChip tone="gray" icon={Layers}>{type.label}</ToneChip>}
                        {due && <ToneChip tone="gray" icon={CalendarClock}>{due}</ToneChip>}
                        {meta && <ToneChip tone={meta.tone}>{meta.label}</ToneChip>}
                    </div>
                    {isPresent(task.title) && <h3 className="text-[16px] font-bold leading-snug">{task.title}</h3>}
                </div>
            </div>

            {description && (
                <div className="campaign-briefing-content break-words text-[14px] leading-relaxed text-gray-700 dark:text-zinc-300" dangerouslySetInnerHTML={{ __html: description }} />
            )}
            <TaskLinks links={links} />

            {status === 'rejected' && isPresent(submission?.rejectionReason) && (
                <p className="rounded-2xl bg-amber-500/10 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-200">{submission.rejectionReason}</p>
            )}
            {isPresent(submission?.contentLink) && /^https?:/.test(submission.contentLink) && (
                <a href={submission.contentLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-emerald-700 dark:text-neon-green">
                    <ExternalLink size={13} className="shrink-0" /> <span className="truncate">{submission.contentLink}</span>
                </a>
            )}

            {canSubmit && status !== 'approved' && (
                <Button
                    variant={status === 'not_started' || status === 'rejected' ? 'primary' : 'secondary'}
                    size="sm"
                    icon={Upload}
                    onClick={() => onSubmit(task)}
                >
                    {status === 'rejected' ? 'Resubmit' : status === 'submitted' ? 'Update submission' : 'Submit'}
                </Button>
            )}
        </li>
    );
};

export default TaskCard;
