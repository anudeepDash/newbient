import React from 'react';
import { 
    FileUp, 
    Link as LinkIcon, 
    FileText, 
    Sparkles, 
    CheckCircle2, 
    ShieldAlert, 
    Sliders, 
    Check,
    Layers,
    Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../ui/Input';

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

    const isPink = accentColor.includes('pink');
    const accentBg = isPink ? 'bg-neon-pink' : 'bg-neon-blue';
    const accentText = isPink ? 'text-neon-pink' : 'text-neon-blue';
    const accentBorder = isPink ? 'border-neon-pink' : 'border-neon-blue';
    const accentShadow = isPink ? 'shadow-[0_0_20px_rgba(255,79,139,0.2)]' : 'shadow-[0_0_20px_rgba(46,191,255,0.2)]';

    return (
        <div className="space-y-6 pt-4 border-t border-black/10 dark:border-white/5">
            {/* Top Toggle Banner */}
            <div className={cn(
                "p-6 rounded-3xl border transition-all duration-300 flex items-center justify-between gap-6",
                enabled 
                    ? `${isPink ? 'bg-neon-pink/10 border-neon-pink/30' : 'bg-neon-blue/10 border-neon-blue/30'} shadow-lg` 
                    : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/5"
            )}>
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md",
                        enabled ? `${accentBg} text-black font-black` : "bg-black/10 dark:bg-white/10 text-gray-500"
                    )}>
                        <FileUp size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                Guestlist Application Task
                            </h4>
                            {enabled && (
                                <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border", accentBorder, accentText)}>
                                    ACTIVE
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                            Require attendees to upload files, share links, or submit tasks to apply for the guestlist.
                        </p>
                    </div>
                </div>

                <button 
                    type="button" 
                    onClick={toggleEnabled}
                    className={cn(
                        "w-14 h-8 rounded-full relative transition-all duration-300 border-2 shrink-0 cursor-pointer",
                        enabled ? `${accentBg} ${accentBorder}` : "bg-white dark:bg-black/60 border-black/10 dark:border-white/10"
                    )}
                >
                    <div className={cn(
                        "absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 shadow-md",
                        enabled ? "right-0.5 bg-white dark:bg-black" : "left-0.5 bg-gray-500"
                    )} />
                </button>
            </div>

            {/* Task Editor Config */}
            {enabled && (
                <div className="p-6 md:p-8 bg-gray-50 dark:bg-black/40 rounded-[2.5rem] border border-black/10 dark:border-white/10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    
                    {/* 1-Click Templates */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={12} className={accentText} /> QUICK TEMPLATES
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {PRESET_TEMPLATES.map((preset, idx) => {
                                const Icon = preset.icon;
                                const isCurrent = currentTask.title === preset.config.title;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => applyPreset(preset.config)}
                                        className={cn(
                                            "p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all group",
                                            isCurrent
                                                ? `${accentBorder} bg-black/10 dark:bg-white/10 ${accentText}`
                                                : "border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/30 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-black/20"
                                        )}
                                    >
                                        <Icon size={16} className={cn("transition-transform group-hover:scale-110", isCurrent ? accentText : "text-gray-500")} />
                                        <span className="text-[10px] font-black uppercase tracking-wider leading-tight">
                                            {preset.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Task Title & Instructions */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                Task Title / Application Prompt *
                            </label>
                            <Input
                                placeholder="E.g. Artwork Submission, Portfolio Challenge, Track Demo"
                                value={currentTask.title}
                                onChange={e => updateField('title', e.target.value)}
                                className="h-14 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-wider px-6"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                Task Details & Guidelines for Applicants
                            </label>
                            <textarea
                                placeholder="Describe the task clearly. What should they upload or prepare? What are the selection criteria?"
                                value={currentTask.description}
                                onChange={e => updateField('description', e.target.value)}
                                rows={3}
                                className="w-full bg-white dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-2xl p-5 text-[11px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-neon-pink/40 resize-none transition-all leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Submission Methods Matrix */}
                    <div className="space-y-4 pt-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                            Accepted Submission Types
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* Option 1: File Upload */}
                            <div className={cn(
                                "p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between",
                                currentTask.allowFileUpload 
                                    ? "bg-white dark:bg-black/60 border-black/20 dark:border-white/20 shadow-sm" 
                                    : "bg-black/5 dark:bg-white/[0.02] border-black/10 dark:border-white/5 opacity-60"
                            )}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <FileUp size={18} className={currentTask.allowFileUpload ? accentText : "text-gray-500"} />
                                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-white">
                                                File Upload
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentTask.allowFileUpload}
                                            onChange={e => updateField('allowFileUpload', e.target.checked)}
                                            className="w-4 h-4 rounded accent-current cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-medium">
                                        Allows attendees to upload attachments (images, PDFs, audio, archives).
                                    </p>
                                </div>

                                {currentTask.allowFileUpload && (
                                    <div className="space-y-3 pt-3 border-t border-black/10 dark:border-white/10">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentTask.requireFileUpload}
                                                onChange={e => updateField('requireFileUpload', e.target.checked)}
                                                className="w-3.5 h-3.5 rounded accent-current cursor-pointer"
                                            />
                                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                                Mandatory / Required
                                            </span>
                                        </label>
                                        <div>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                                Format Hint
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="E.g. PNG, JPG, PDF, MP3"
                                                value={currentTask.fileTypeHint}
                                                onChange={e => updateField('fileTypeHint', e.target.value)}
                                                className="w-full h-8 px-3 text-[10px] rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Option 2: Link / URL */}
                            <div className={cn(
                                "p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between",
                                currentTask.allowLink 
                                    ? "bg-white dark:bg-black/60 border-black/20 dark:border-white/20 shadow-sm" 
                                    : "bg-black/5 dark:bg-white/[0.02] border-black/10 dark:border-white/5 opacity-60"
                            )}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <LinkIcon size={18} className={currentTask.allowLink ? accentText : "text-gray-500"} />
                                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-white">
                                                Link / URL
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentTask.allowLink}
                                            onChange={e => updateField('allowLink', e.target.checked)}
                                            className="w-4 h-4 rounded accent-current cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-medium">
                                        Allows attendees to paste web links (portfolio, Instagram, SoundCloud, Drive).
                                    </p>
                                </div>

                                {currentTask.allowLink && (
                                    <div className="space-y-3 pt-3 border-t border-black/10 dark:border-white/10">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentTask.requireLink}
                                                onChange={e => updateField('requireLink', e.target.checked)}
                                                className="w-3.5 h-3.5 rounded accent-current cursor-pointer"
                                            />
                                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                                Mandatory / Required
                                            </span>
                                        </label>
                                        <div>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                                Placeholder Hint
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="https://..."
                                                value={currentTask.linkPlaceholder}
                                                onChange={e => updateField('linkPlaceholder', e.target.value)}
                                                className="w-full h-8 px-3 text-[10px] rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Option 3: Text Response */}
                            <div className={cn(
                                "p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between",
                                currentTask.allowText 
                                    ? "bg-white dark:bg-black/60 border-black/20 dark:border-white/20 shadow-sm" 
                                    : "bg-black/5 dark:bg-white/[0.02] border-black/10 dark:border-white/5 opacity-60"
                            )}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <FileText size={18} className={currentTask.allowText ? accentText : "text-gray-500"} />
                                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-white">
                                                Written Pitch
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentTask.allowText}
                                            onChange={e => updateField('allowText', e.target.checked)}
                                            className="w-4 h-4 rounded accent-current cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-medium">
                                        Allows attendees to write a statement, answer a prompt, or pitch themselves.
                                    </p>
                                </div>

                                {currentTask.allowText && (
                                    <div className="space-y-3 pt-3 border-t border-black/10 dark:border-white/10">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentTask.requireText}
                                                onChange={e => updateField('requireText', e.target.checked)}
                                                className="w-3.5 h-3.5 rounded accent-current cursor-pointer"
                                            />
                                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                                Mandatory / Required
                                            </span>
                                        </label>
                                        <div>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                                Field Prompt
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Prompt for applicant"
                                                value={currentTask.textPrompt}
                                                onChange={e => updateField('textPrompt', e.target.value)}
                                                className="w-full h-8 px-3 text-[10px] rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Review & Approval Policy */}
                    <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                            Application Review Mode
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => updateField('reviewRequired', true)}
                                className={cn(
                                    "p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5",
                                    currentTask.reviewRequired
                                        ? `${accentBorder} bg-black/5 dark:bg-white/10 shadow-sm`
                                        : "border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 opacity-70 hover:opacity-100"
                                )}
                            >
                                <div className={cn("w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0", currentTask.reviewRequired ? `${accentBg} text-black font-black border-transparent` : "border-gray-500")}>
                                    {currentTask.reviewRequired && <Check size={12} strokeWidth={3} />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-white">
                                        Curated Review (Recommended)
                                    </p>
                                    <p className="text-[9px] text-gray-500 leading-relaxed font-medium">
                                        Submissions enter "Pending" review status. Admin reviews tasks in Ticketing & Guestlist Ops and manually approves or rejects.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => updateField('reviewRequired', false)}
                                className={cn(
                                    "p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5",
                                    !currentTask.reviewRequired
                                        ? `${accentBorder} bg-black/5 dark:bg-white/10 shadow-sm`
                                        : "border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 opacity-70 hover:opacity-100"
                                )}
                            >
                                <div className={cn("w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0", !currentTask.reviewRequired ? `${accentBg} text-black font-black border-transparent` : "border-gray-500")}>
                                    {!currentTask.reviewRequired && <Check size={12} strokeWidth={3} />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-white">
                                        Instant Confirmation
                                    </p>
                                    <p className="text-[9px] text-gray-500 leading-relaxed font-medium">
                                        Passes and QR codes are confirmed immediately when the user submits their task. Admin can still audit submissions later.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default GuestlistTaskConfig;
