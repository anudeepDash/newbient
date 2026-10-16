import React, { useRef, useState } from 'react';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import X from 'lucide-react/dist/esm/icons/x';
import { TextInput } from '../../components/app';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { isPresent } from '../../lib/present';

/*
 * The guestlist's task (a file, a link and/or a short answer), as configured
 * on the guestlist: the same options GuestlistTaskSubmissionStep reads, laid
 * out for a phone. Files go to Cloudinary like before.
 *
 *   value: { fileUrl, fileName, fileType, fileSize, link, text }
 *   validateTask(task, value) → error message or ''
 */

export const validateTask = (task, v = {}) => {
    if (!task) return '';
    if (task.allowFileUpload !== false && task.requireFileUpload && !v.fileUrl) return 'Upload the file this task asks for.';
    if (task.allowLink !== false && task.requireLink && !String(v.link || '').trim()) return 'Add the link this task asks for.';
    if (task.allowLink !== false && String(v.link || '').trim() && !/^https:\/\//i.test(String(v.link).trim())) return 'Links must start with https://';
    if (task.allowText !== false && task.requireText && !String(v.text || '').trim()) return 'Write your answer to continue.';
    if (!v.fileUrl && !String(v.link || '').trim() && !String(v.text || '').trim()) return 'Complete the task to register.';
    return '';
};

const GuestlistTaskFields = ({ task, value, onChange, onUploading }) => {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const set = (patch) => onChange({ ...value, ...patch });

    const upload = async (file) => {
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) { setError('Files must be under 50 MB. Share a link instead.'); return; }
        setError('');
        setUploading(true);
        onUploading?.(true);
        try {
            const url = await useLegacyStore.getState().uploadToCloudinary(file);
            if (!url) throw new Error('no url');
            set({ fileUrl: url, fileName: file.name, fileType: file.type, fileSize: file.size });
        } catch {
            setError('We couldn’t upload that file. Try again, or share a link.');
        } finally {
            setUploading(false);
            onUploading?.(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                {isPresent(task.title) && <p className="text-[16px] font-bold">{task.title}</p>}
                {isPresent(task.description) && <p className="whitespace-pre-line text-[15px] text-gray-600 dark:text-zinc-400">{task.description}</p>}
            </div>

            {task.allowFileUpload !== false && (
                <div className="space-y-1.5">
                    <span className="block text-[13px] font-semibold text-gray-600 dark:text-zinc-400">File{task.requireFileUpload ? '' : ' (optional)'}</span>
                    {value.fileUrl ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                            <Paperclip size={16} className="shrink-0 text-emerald-700 dark:text-neon-green" />
                            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{value.fileName || 'Uploaded file'}</span>
                            <button type="button" aria-label="Remove file" onClick={() => set({ fileUrl: '', fileName: '', fileType: '', fileSize: 0 })} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 dark:hover:bg-white/10">
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading}
                            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[0.15] text-[15px] font-semibold text-gray-700 disabled:opacity-60 dark:border-white/[0.15] dark:text-zinc-300"
                        >
                            <Paperclip size={16} /> {uploading ? 'Uploading…' : 'Choose a file'}
                        </button>
                    )}
                    {isPresent(task.fileTypeHint) && !value.fileUrl && <span className="block text-[12px] text-gray-500 dark:text-zinc-500">{task.fileTypeHint}</span>}
                    <input ref={inputRef} type="file" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                </div>
            )}

            {task.allowLink !== false && (
                <TextInput
                    label={`Link${task.requireLink ? '' : ' (optional)'}`}
                    type="url"
                    inputMode="url"
                    autoCapitalize="none"
                    placeholder={task.linkPlaceholder || 'https://'}
                    value={value.link || ''}
                    onChange={(e) => set({ link: e.target.value })}
                />
            )}

            {task.allowText !== false && (
                <label className="block space-y-1.5">
                    <span className="block text-[13px] font-semibold text-gray-600 dark:text-zinc-400">{task.textPrompt || 'Your answer'}{task.requireText ? '' : ' (optional)'}</span>
                    <textarea
                        rows={4}
                        value={value.text || ''}
                        onChange={(e) => set({ text: e.target.value })}
                        className="w-full rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-[16px] text-gray-900 outline-none focus:border-gray-900 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white dark:focus:border-neon-green/60"
                    />
                </label>
            )}

            {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

export default GuestlistTaskFields;
