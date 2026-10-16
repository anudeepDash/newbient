import React, { useState } from 'react';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Badge, Button, Menu, MenuItem } from '../ui';
import { Field, fieldCls, Choice } from '../uploads/UploadKit';
import RichEditor from '../RichEditor';
import { TASK_TYPES, PLATFORMS, taskTypeOf, platformOf, formatDay, toDayInput, daysUntil } from './campaignModel';
import { Spinner } from './parts';
import ThemedSelect from '../ThemedSelect';

const TYPE_TONE = { story: 'pink', reel: 'violet', content_post: 'blue', visit_event: 'amber', custom: 'teal' };
const selectCls = cn(fieldCls, 'cursor-pointer');

/** One link the creator gets as a tap-to-open button: label + address. */
const LinkPair = ({ icon: Icon, tone, title, hint, label, url, onLabel, onUrl, labelPlaceholder, urlPlaceholder, onRemove }) => (
    <div className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
        <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[13px] font-bold">
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', accent(tone).chip)}><Icon size={14} /></span>
                <span className="truncate">{title}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
                {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-sky-600 hover:bg-black/5 dark:text-neon-blue dark:hover:bg-white/5">
                        Test <ExternalLink size={11} />
                    </a>
                )}
                {onRemove && (
                    <button type="button" onClick={onRemove} aria-label="Remove link" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500"><X size={14} /></button>
                )}
            </span>
        </div>
        {hint && <p className="-mt-1 mb-2 text-[12px] text-gray-500">{hint}</p>}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <input className={cn(fieldCls, 'h-11 text-[14px]')} value={label || ''} onChange={(e) => onLabel(e.target.value)} placeholder={labelPlaceholder} aria-label={`${title} button text`} />
            <input className={cn(fieldCls, 'h-11 text-[14px] font-medium')} value={url || ''} onChange={(e) => onUrl(e.target.value)} placeholder={urlPlaceholder} inputMode="url" autoCapitalize="off" autoCorrect="off" aria-label={`${title} link`} />
        </div>
    </div>
);

/**
 * A deliverable in the campaign editor. Collapsed it shows a one-line summary;
 * open it to edit the title, format, deadline, links and instructions.
 */
const TaskCard = ({
    task, index, total, submissionsCount, open, onToggle, onChange, onMove, onDuplicate, onRemove, onShare,
    onUploadAsset, uploading,
}) => {
    const [showMore, setShowMore] = useState(false);
    const type = taskTypeOf(task.taskType);
    const TypeIcon = type.icon;
    const PlatformIcon = platformOf(task.platform).icon;
    const tone = TYPE_TONE[task.taskType] || 'teal';
    const set = (patch) => onChange(index, patch);
    const links = task.taskLinks || [];
    const linkCount = [task.googleFormLink, task.ticketLink, task.referencePostUrl].filter(Boolean).length + links.filter(l => l.url).length;
    const due = daysUntil(task.deadline);

    return (
        <div className={cn('overflow-hidden rounded-2xl border transition-colors', open ? 'border-pink-500/30 dark:border-neon-pink/30' : 'border-black/[0.08] dark:border-white/[0.08]')}>
            <div className="flex items-center gap-2 p-2 pr-2 sm:p-3">
                <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(tone).chip)}><TypeIcon size={18} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-bold">{task.title || `Deliverable ${index + 1}`}</span>
                            <Badge tone={task.priority === 'optional' ? 'gray' : 'pink'}>{task.priority === 'optional' ? 'Optional' : 'Required'}</Badge>
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[12px] text-gray-500">
                            <span className="inline-flex items-center gap-1"><PlatformIcon size={12} /> {platformOf(task.platform).label}</span>
                            <span>{type.label}</span>
                            {task.deadline && (
                                <span className={cn(due !== null && due < 0 && 'font-semibold text-rose-600 dark:text-rose-300')}>
                                    Due {formatDay(task.deadline)}
                                </span>
                            )}
                            {linkCount > 0 && <span>{linkCount} link{linkCount === 1 ? '' : 's'}</span>}
                            {submissionsCount > 0 && <span className="font-semibold text-amber-600 dark:text-amber-300">{submissionsCount} submitted</span>}
                        </span>
                    </span>
                    <ChevronDown size={16} className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
                </button>
                <Menu trigger={({ toggle }) => (
                    <button type="button" onClick={toggle} aria-label="Deliverable actions" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-black/5 dark:hover:bg-white/5">
                        <MoreHorizontal size={16} />
                    </button>
                )}>
                    {index > 0 && <MenuItem icon={ArrowUp} onClick={() => onMove(index, -1)}>Move up</MenuItem>}
                    {index < total - 1 && <MenuItem icon={ArrowDown} onClick={() => onMove(index, 1)}>Move down</MenuItem>}
                    <MenuItem icon={Copy} onClick={() => onDuplicate(index)}>Duplicate</MenuItem>
                    {onShare && <MenuItem icon={Share2} onClick={() => onShare(task.id)} hint="Opens this task for creators">Copy task link</MenuItem>}
                    <MenuItem icon={Trash2} danger onClick={() => onRemove(index)}>Remove</MenuItem>
                </Menu>
            </div>

            {open && (
                <div className="space-y-5 border-t border-black/[0.06] px-3 pb-4 pt-4 dark:border-white/[0.06] sm:px-4">
                    <Field label="Title">
                        <input className={fieldCls} value={task.title || ''} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Instagram story with ticket link" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Format">
                            <ThemedSelect className={selectCls} value={task.taskType || 'custom'} onChange={(e) => set({ taskType: e.target.value })}>
                                {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </ThemedSelect>
                        </Field>
                        <Field label="Platform">
                            <ThemedSelect className={selectCls} value={task.platform || 'instagram'} onChange={(e) => set({ platform: e.target.value })}>
                                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </ThemedSelect>
                        </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <span className="mb-1 block text-[12px] font-bold text-gray-500">Needed to finish the campaign?</span>
                            <Choice
                                value={task.priority === 'optional' ? 'optional' : 'required'}
                                onChange={(v) => set({ priority: v })}
                                options={[{ value: 'required', label: 'Required' }, { value: 'optional', label: 'Optional', hint: 'Bonus' }]}
                            />
                        </div>
                        <Field label="Deadline" optional>
                            <input className={fieldCls} type="date" value={toDayInput(task.deadline)} onChange={(e) => set({ deadline: e.target.value })} />
                        </Field>
                    </div>

                    <div className="space-y-2">
                        <div>
                            <h4 className="text-[13px] font-bold">Buttons for the creator</h4>
                            <p className="text-[12px] text-gray-500">Each link shows as a tap-to-open button on the creator&apos;s phone.</p>
                        </div>
                        <LinkPair
                            icon={FileText} tone="violet" title="Submission form"
                            hint="A Google Form where they upload proof or files."
                            label={task.googleFormLabel} url={task.googleFormLink}
                            onLabel={(v) => set({ googleFormLabel: v })} onUrl={(v) => set({ googleFormLink: v })}
                            labelPlaceholder="Submit via Google Form" urlPlaceholder="https://forms.gle/…"
                        />
                        <LinkPair
                            icon={Ticket} tone="green" title="Ticket or event link"
                            hint="For a story link sticker or a booking page."
                            label={task.ticketLabel} url={task.ticketLink}
                            onLabel={(v) => set({ ticketLabel: v })} onUrl={(v) => set({ ticketLink: v })}
                            labelPlaceholder="Add this ticket link (story sticker)" urlPlaceholder="https://…"
                        />
                        <LinkPair
                            icon={ImageIcon} tone="pink" title="Post or creative to use"
                            hint="An Instagram post to repost, or a Drive folder of assets."
                            label={task.referencePostLabel} url={task.referencePostUrl}
                            onLabel={(v) => set({ referencePostLabel: v })} onUrl={(v) => set({ referencePostUrl: v })}
                            labelPlaceholder="Repost this poster" urlPlaceholder="https://www.instagram.com/p/…"
                        />
                        {links.map((l, i) => (
                            <LinkPair
                                key={l.id || i}
                                icon={Link2} tone="gray" title={`Extra link ${i + 1}`}
                                label={l.label} url={l.url}
                                onLabel={(v) => set({ taskLinks: links.map((x, j) => (j === i ? { ...x, label: v } : x)) })}
                                onUrl={(v) => set({ taskLinks: links.map((x, j) => (j === i ? { ...x, url: v } : x)) })}
                                labelPlaceholder="Guidelines PDF" urlPlaceholder="https://…"
                                onRemove={() => set({ taskLinks: links.filter((_, j) => j !== i) })}
                            />
                        ))}
                        <Button variant="secondary" onClick={() => set({ taskLinks: [...links, { id: `${Date.now()}`, label: '', url: '' }] })} className="h-11 w-full border-dashed">
                            <Plus size={14} /> Add another link
                        </Button>
                    </div>

                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Instructions</span>
                        <RichEditor
                            value={task.description || ''}
                            onChange={(v) => set({ description: v })}
                            placeholder="What to post, what to tag (@newbi.live), how long to keep it up…"
                            minHeight={120}
                            label="Deliverable instructions"
                        />
                    </div>

                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Reference images <span className="font-medium">(optional)</span></span>
                        <div className="flex flex-wrap gap-2">
                            {(task.creativeAssets || []).map((url, i) => (
                                <div key={`${url}-${i}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                                    <img src={url} alt="" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => set({ creativeAssets: (task.creativeAssets || []).filter((_, j) => j !== i) })}
                                        aria-label="Remove image"
                                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                            <label className={cn('flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/10 text-gray-500 hover:border-black/25 dark:border-white/10 dark:hover:border-white/25', uploading && 'pointer-events-none opacity-60')}>
                                {uploading ? <Spinner /> : <Plus size={18} />}
                                <span className="text-[11px] font-semibold">{uploading ? 'Uploading' : 'Add'}</span>
                                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUploadAsset(index, f); }} />
                            </label>
                        </div>
                    </div>

                    {(task.captionScript || task.creativeLink) && (
                        <div>
                            <button type="button" onClick={() => setShowMore(v => !v)} className="flex h-9 items-center gap-1 text-[12px] font-semibold text-gray-500">
                                Older fields <ChevronDown size={13} className={cn('transition-transform', showMore && 'rotate-180')} />
                            </button>
                            {showMore && (
                                <div className="mt-2 space-y-3">
                                    {task.captionScript !== undefined && task.captionScript !== '' && (
                                        <Field label="Caption script">
                                            <textarea className={cn(fieldCls, 'h-auto py-3')} rows={3} value={task.captionScript} onChange={(e) => set({ captionScript: e.target.value })} />
                                        </Field>
                                    )}
                                    {task.creativeLink && (
                                        <Field label="Creative link">
                                            <input className={fieldCls} value={task.creativeLink} onChange={(e) => set({ creativeLink: e.target.value })} />
                                        </Field>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskCard;
