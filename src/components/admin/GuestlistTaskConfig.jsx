import React from 'react';
import FileUp from 'lucide-react/dist/esm/icons/file-up';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Check from 'lucide-react/dist/esm/icons/check';
import Layers from 'lucide-react/dist/esm/icons/layers';
import { cn } from '../../lib/utils';
import { Field, Toggle, Choice, fieldCls, areaCls } from './uploads/UploadKit';

const DEFAULT_TASK_CONFIG = {
    title: '',
    description: '',
    allowFileUpload: true,
    requireFileUpload: true,
    fileTypeHint: 'Images (PNG/JPG), Audio (MP3), PDF, or ZIP',
    allowLink: true,
    requireLink: false,
    linkPlaceholder: 'https://instagram.com/..., Behance, Google Drive, SoundCloud',
    allowText: true,
    requireText: false,
    textPrompt: 'Tell us about your work or why you want to attend',
    reviewRequired: true
};

const PRESET_TEMPLATES = [
    {
        name: 'Portfolio / Artwork',
        icon: Sparkles,
        config: {
            title: 'Creative Portfolio Submission',
            description: 'Upload your original artwork or design sample, and provide your portfolio / Instagram link. Selected creators will receive confirmed entry.',
            allowFileUpload: true,
            requireFileUpload: true,
            fileTypeHint: 'PNG, JPG, PDF, or ZIP',
            allowLink: true,
            requireLink: false,
            linkPlaceholder: 'https://instagram.com/yourprofile or Behance',
            allowText: true,
            requireText: false,
            textPrompt: 'Brief description of your submission or artistic style',
            reviewRequired: true
        }
    },
    {
        name: 'Music / DJ Demo',
        icon: Layers,
        config: {
            title: 'Demo Track / Mix Submission',
            description: 'Upload an original demo track (MP3/WAV) or provide your SoundCloud / Spotify / YouTube link for guestlist consideration.',
            allowFileUpload: true,
            requireFileUpload: false,
            fileTypeHint: 'Audio files (MP3, WAV, AAC)',
            allowLink: true,
            requireLink: true,
            linkPlaceholder: 'https://soundcloud.com/... or Spotify link',
            allowText: true,
            requireText: false,
            textPrompt: 'Track genre, BPM, and brief artist bio',
            reviewRequired: true
        }
    },
    {
        name: 'Proof of Work / Promo',
        icon: FileUp,
        config: {
            title: 'Social Share / Proof of Activity',
            description: 'Upload a screenshot showing you shared the event poster on your Instagram Story or Twitter, or drop your social post link.',
            allowFileUpload: true,
            requireFileUpload: true,
            fileTypeHint: 'Screenshots (PNG, JPG)',
            allowLink: true,
            requireLink: false,
            linkPlaceholder: 'https://instagram.com/... or post URL',
            allowText: false,
            requireText: false,
            textPrompt: '',
            reviewRequired: true
        }
    },
    {
        name: 'Statement / Pitch',
        icon: FileText,
        config: {
            title: 'Guestlist Statement of Intent',
            description: 'Why do you want to join this exclusive session? Share what you aim to experience or contribute to the community.',
            allowFileUpload: false,
            requireFileUpload: false,
            fileTypeHint: '',
            allowLink: false,
            requireLink: false,
            linkPlaceholder: '',
            allowText: true,
            requireText: true,
            textPrompt: 'Explain why you should be granted entry to this event',
            reviewRequired: true
        }
    }
];

export const GuestlistTaskConfig = ({
    enabled = false,
    taskData = DEFAULT_TASK_CONFIG,
    onChange,
    accentColor = 'neon-pink'
}) => {
    const currentTask = { ...DEFAULT_TASK_CONFIG, ...taskData };

    const updateField = (key, value) => {
        onChange({
            hasGuestlistTask: enabled,
            guestlistTask: {
                ...currentTask,
                [key]: value
            }
        });
    };

    const toggleEnabled = () => {
        const nextEnabled = !enabled;
        onChange({
            hasGuestlistTask: nextEnabled,
            guestlistTask: currentTask.title ? currentTask : DEFAULT_TASK_CONFIG
        });
    };

    const applyPreset = (presetConfig) => {
        onChange({
            hasGuestlistTask: true,
            guestlistTask: {
                ...DEFAULT_TASK_CONFIG,
                ...presetConfig
            }
        });
    };

    // Allow / require switch for one kind of submission.
    const part = ({ icon: Icon, title, hint, allowKey, requireKey, detailKey, detailLabel, detailPlaceholder }) => (
        <div key={allowKey} className={cn('rounded-xl border p-3.5 transition-colors', currentTask[allowKey] ? 'border-black/10 dark:border-white/15' : 'border-black/[0.06] opacity-80 dark:border-white/[0.06]')}>
            <Toggle
                label={<span className="flex items-center gap-2"><Icon size={15} className="text-gray-500" /> {title}</span>}
                hint={hint}
                checked={!!currentTask[allowKey]}
                onChange={(v) => updateField(allowKey, v)}
            />
            {currentTask[allowKey] && (
                <div className="mt-3 space-y-3 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold">
                        <input type="checkbox" checked={!!currentTask[requireKey]} onChange={(e) => updateField(requireKey, e.target.checked)} className="h-5 w-5 accent-emerald-500" />
                        Required
                    </label>
                    <Field label={detailLabel}>
                        <input className={fieldCls} value={currentTask[detailKey] || ''} placeholder={detailPlaceholder} onChange={(e) => updateField(detailKey, e.target.value)} />
                    </Field>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4 rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
            <Toggle
                label="Ask for something to apply"
                hint="Applicants upload a file, share a link or write a note before they get a spot"
                checked={enabled}
                onChange={toggleEnabled}
            />

            {enabled && (
                <div className="space-y-5 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                    <div className="space-y-2">
                        <span className="text-[12px] font-bold text-gray-500">Start from</span>
                        <div className="grid grid-cols-2 gap-2">
                            {PRESET_TEMPLATES.map(preset => {
                                const Icon = preset.icon;
                                const current = currentTask.title === preset.config.title;
                                return (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => applyPreset(preset.config)}
                                        className={cn('flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition-colors',
                                            current ? 'border-emerald-500/60 bg-neon-green/[0.08] dark:border-neon-green/50' : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}
                                    >
                                        <Icon size={15} className="shrink-0 text-gray-500" />
                                        <span className="min-w-0 flex-1 leading-tight">{preset.name}</span>
                                        {current && <Check size={14} className="shrink-0 text-emerald-600 dark:text-neon-green" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <Field label="Task name">
                        <input className={fieldCls} value={currentTask.title} placeholder="e.g. Share your portfolio" onChange={(e) => updateField('title', e.target.value)} />
                    </Field>
                    <Field label="Instructions" hint="What to submit and how you'll pick people">
                        <textarea className={areaCls} rows={3} value={currentTask.description} placeholder="Upload one original piece and your Instagram link. We'll confirm selected people by email." onChange={(e) => updateField('description', e.target.value)} />
                    </Field>

                    <div className="space-y-2">
                        <span className="text-[12px] font-bold text-gray-500">What they can send</span>
                        {part({ icon: FileUp, title: "File upload", hint: "Images, audio, PDF or ZIP", allowKey: "allowFileUpload", requireKey: "requireFileUpload", detailKey: "fileTypeHint", detailLabel: "Accepted files (shown to applicants)", detailPlaceholder: "e.g. PNG, JPG, PDF, MP3" })}
                        {part({ icon: LinkIcon, title: "Link", hint: "Instagram, Behance, Drive, SoundCloud…", allowKey: "allowLink", requireKey: "requireLink", detailKey: "linkPlaceholder", detailLabel: "Example link (placeholder)", detailPlaceholder: "https://…" })}
                        {part({ icon: FileText, title: "Written answer", hint: "A short note or pitch", allowKey: "allowText", requireKey: "requireText", detailKey: "textPrompt", detailLabel: "Question to answer", detailPlaceholder: "Why do you want to attend?" })}
                    </div>

                    <div className="space-y-2">
                        <span className="text-[12px] font-bold text-gray-500">After they apply</span>
                        <Choice value={currentTask.reviewRequired ? 'review' : 'instant'} onChange={(v) => updateField('reviewRequired', v === 'review')} options={[
                            { value: 'review', label: 'You review first', hint: 'Approve or reject in Ticketing' },
                            { value: 'instant', label: 'Confirm instantly', hint: 'Pass is issued on submit' },
                        ]} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestlistTaskConfig;
