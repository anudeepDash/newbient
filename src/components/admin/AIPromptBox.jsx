import React, { useEffect, useId, useRef, useState } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import X from 'lucide-react/dist/esm/icons/x';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { cn } from '../../lib/utils';
import { accent as accentFor, useAccent } from './theme';
import { Button } from './ui';
import { inspectPdf, isPdfFile } from '../../lib/pdfInspect';
import ThemedSelect from './ThemedSelect';

/*
 * The AI brief box: what to write, example briefs, attached reference files
 * (text or PDF, read in the browser and sent as text), an optional tone, and
 * live progress with a Cancel while the AI works.
 *
 * Works controlled (value/onChange) or on its own; `onGenerate(prompt)` is
 * called with the brief (attachments are the caller's to combine).
 */

const DEFAULT_EXAMPLES = {
    proposal: [
        'Event production proposal for a 2-day music festival, including stage, sound and lighting',
        'Artist logistics and hospitality for a multi-city stand-up comedy tour',
        'Digital marketing and social media coverage for a product launch event',
    ],
    contract: [
        'Service contract for social media management for 12 months, ₹50,000 total value',
        'Freelancer contract for video editing services, 6-month engagement',
    ],
    invoice: ['Invoice for 3 months of social media management at ₹15,000 a month for Karma Foods'],
    form: ['Volunteer registration form for a community event in Bengaluru'],
    document: [],
};

const TEXT_TYPES = /\.(txt|md|markdown|csv|tsv|json|html?|rtf|xml)$/i;
const MAX_FILE_MB = 15;
const MAX_FILE_CHARS = 20000;

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** Reads a picked file into plain text. Resolves { text } or { error }. */
export const readAttachment = async (file) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) return { error: `Over ${MAX_FILE_MB} MB` };
    try {
        if (isPdfFile(file)) {
            const info = await inspectPdf(file, { thumbWidth: 120, textPages: 20 });
            const text = (info?.lines || []).join('\n').trim();
            if (!text) return { error: "No readable text (scanned PDF?)" };
            return { text: text.slice(0, MAX_FILE_CHARS), truncated: text.length > MAX_FILE_CHARS };
        }
        if (TEXT_TYPES.test(file.name) || (file.type || '').startsWith('text/') || file.type === 'application/json') {
            let text = await file.text();
            if (/\.html?$/i.test(file.name)) text = text.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ');
            text = text.trim();
            if (!text) return { error: 'The file is empty' };
            return { text: text.slice(0, MAX_FILE_CHARS), truncated: text.length > MAX_FILE_CHARS };
        }
        return { error: 'Only PDF and text files can be read' };
    } catch {
        return { error: "Couldn't read this file" };
    }
};

const STAGES = [
    { at: 0, text: 'Reading your brief' },
    { at: 4, text: 'Writing the content' },
    { at: 14, text: 'Laying out the sections' },
    { at: 28, text: 'Polishing the details' },
    { at: 45, text: 'Taking longer than usual. You can keep waiting or cancel.' },
];

/** Elapsed seconds while `active`. */
export const useElapsed = (active) => {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        if (!active) { setSeconds(0); return undefined; }
        const started = Date.now();
        setSeconds(0);
        const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
        return () => clearInterval(t);
    }, [active]);
    return seconds;
};

export const GenerationProgress = ({ label, seconds, onCancel, tone, className }) => {
    const a = tone ? accentFor(tone) : null;
    const moduleAccent = useAccent();
    const ac = a || moduleAccent;
    const stage = [...STAGES].reverse().find(s => seconds >= s.at) || STAGES[0];
    const percent = Math.min(96, Math.round(96 * (1 - Math.exp(-seconds / 18))));
    return (
        <div className={cn('rounded-2xl border p-4', ac.border, ac.soft, className)} role="status" aria-live="polite">
            <div className="flex items-start gap-3">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', ac.chip)}>
                    <Loader2 size={18} className="animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-gray-900 dark:text-white">{label || 'Working on it'}</p>
                    <p className="text-[13px] text-gray-600 dark:text-zinc-400">{stage.text}</p>
                </div>
                <span className="shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums text-gray-500">{seconds}s</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <div className={cn('h-full rounded-full transition-[width] duration-700', ac.dot)} style={{ width: `${percent}%` }} />
            </div>
            {onCancel && (
                <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
                </div>
            )}
        </div>
    );
};

const AIPromptBox = ({
    onGenerate,
    isGenerating = false,
    type = 'document',
    forceClear = false,
    value,
    onChange,
    placeholder,
    examples,
    attachments,
    onAttachmentsChange,
    tones,
    tone,
    onToneChange,
    onCancel,
    submitLabel = 'Generate',
    generatingLabel,
    maxChars,
    extraChars = 0,
    accentTone,
    autoFocus = false,
}) => {
    const moduleAccent = useAccent();
    const a = accentTone ? accentFor(accentTone) : moduleAccent;
    const [inner, setInner] = useState('');
    const prompt = value !== undefined ? value : inner;
    const setPrompt = (v) => { if (value === undefined) setInner(v); onChange?.(v); };
    const [error, setError] = useState(null);
    const textareaRef = useRef(null);
    const fileRef = useRef(null);
    const seconds = useElapsed(isGenerating);
    const toneId = useId();

    useEffect(() => { if (forceClear) setPrompt(''); }, [forceClear]); // eslint-disable-line react-hooks/exhaustive-deps

    // Grow with the text, up to a comfortable height.
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
    }, [prompt]);

    useEffect(() => { if (autoFocus) textareaRef.current?.focus(); }, [autoFocus]);

    const list = examples || DEFAULT_EXAMPLES[type] || [];
    const files = attachments || [];
    const reading = files.some(f => f.status === 'reading');
    const total = prompt.length + extraChars;
    const tooLong = maxChars ? total > maxChars : false;
    const canSubmit = prompt.trim().length >= 5 && !isGenerating && !reading && !tooLong;

    const submit = async () => {
        if (!canSubmit) {
            if (prompt.trim().length < 5 && !isGenerating) setError('Add a little more detail first.');
            return;
        }
        setError(null);
        try {
            await onGenerate?.(prompt);
        } catch (err) {
            if (err?.name !== 'AbortError') setError(err?.message || "Couldn't generate. Please try again.");
        }
    };

    const addFiles = async (picked) => {
        if (!onAttachmentsChange || !picked?.length) return;
        const added = Array.from(picked).map(file => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            size: file.size,
            status: 'reading',
            file,
        }));
        let current = [...files, ...added];
        onAttachmentsChange(current);
        for (const item of added) {
            const result = await readAttachment(item.file);
            current = current.map(f => (f.id === item.id
                ? { id: f.id, name: f.name, size: f.size, status: result.error ? 'error' : 'ready', text: result.text || '', truncated: result.truncated, error: result.error }
                : f));
            onAttachmentsChange(current);
        }
    };

    return (
        <div className="space-y-3">
            <div className={cn(
                'rounded-2xl border bg-white transition-colors dark:bg-white/[0.03]',
                isGenerating ? cn(a.border) : 'border-black/10 focus-within:border-black/25 dark:border-white/10 dark:focus-within:border-white/25'
            )}>
                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => { setPrompt(e.target.value); if (error) setError(null); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
                    }}
                    placeholder={placeholder || `Describe the ${type} you need. The more detail, the better the first draft.`}
                    disabled={isGenerating}
                    rows={4}
                    aria-label="Brief for the AI"
                    className="block min-h-[120px] w-full resize-none rounded-t-2xl bg-transparent px-4 pb-2 pt-3.5 text-[15px] leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60 dark:text-white dark:placeholder:text-zinc-500"
                />

                {files.length > 0 && (
                    <ul className="flex flex-wrap gap-2 px-3 pb-2">
                        {files.map(f => (
                            <li key={f.id} className={cn(
                                'flex min-w-0 max-w-full items-center gap-2 rounded-xl border py-1.5 pl-2.5 pr-1 text-[12.5px]',
                                f.status === 'error' ? 'border-red-500/30 bg-red-500/[0.06]' : 'border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]'
                            )}>
                                {f.status === 'reading' ? <Loader2 size={14} className="shrink-0 animate-spin text-gray-400" />
                                    : f.status === 'error' ? <AlertTriangle size={14} className="shrink-0 text-red-500" />
                                    : <FileText size={14} className={cn('shrink-0', a.text)} />}
                                <span className="min-w-0 truncate font-semibold">{f.name}</span>
                                <span className="shrink-0 text-gray-500">
                                    {f.status === 'reading' ? 'Reading…' : f.status === 'error' ? f.error : `${formatSize(f.size)}${f.truncated ? ' · first part only' : ''}`}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onAttachmentsChange(files.filter(x => x.id !== f.id))}
                                    disabled={isGenerating}
                                    aria-label={`Remove ${f.name}`}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    <X size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] px-2 py-2 dark:border-white/[0.06]">
                    {onAttachmentsChange && (
                        <>
                            <input
                                ref={fileRef}
                                type="file"
                                multiple
                                accept=".pdf,.txt,.md,.csv,.json,.html,.htm,text/plain,application/pdf"
                                className="hidden"
                                onChange={(e) => { const picked = e.target.files; addFiles(picked); e.target.value = ''; }}
                            />
                            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={isGenerating} className="h-10">
                                <Paperclip size={15} /> Attach
                            </Button>
                        </>
                    )}
                    {tones && onToneChange && (
                        <label htmlFor={toneId} className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-semibold text-gray-500">
                            Tone
                            <ThemedSelect
                                id={toneId}
                                value={tone}
                                onChange={(e) => onToneChange(e.target.value)}
                                disabled={isGenerating}
                                className="h-10 cursor-pointer rounded-lg border border-black/10 bg-white px-2 text-[13px] font-semibold text-gray-800 outline-none dark:border-white/10 dark:bg-[#0d0f15] dark:text-zinc-200"
                            >
                                {tones.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </ThemedSelect>
                        </label>
                    )}
                    <span className="ml-auto hidden text-[12px] text-gray-400 sm:inline">
                        {maxChars && total > maxChars * 0.8
                            ? <span className={tooLong ? 'font-semibold text-red-500' : ''}>{total.toLocaleString('en-IN')} / {maxChars.toLocaleString('en-IN')} characters</span>
                            : '⌘/Ctrl + Enter to generate'}
                    </span>
                    <Button
                        variant="accent"
                        onClick={submit}
                        disabled={!canSubmit}
                        className="ml-auto h-10 sm:ml-0"
                    >
                        {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {isGenerating ? (generatingLabel || 'Generating') : reading ? 'Reading files…' : submitLabel}
                    </Button>
                </div>
            </div>

            {tooLong && (
                <p className="text-[12.5px] font-semibold text-red-500">
                    The brief is too long ({total.toLocaleString('en-IN')} characters). Trim the text or remove an attachment to stay under {maxChars.toLocaleString('en-IN')}.
                </p>
            )}
            {error && (
                <p className="flex items-center gap-2 text-[13px] font-semibold text-red-600 dark:text-red-400"><AlertTriangle size={14} /> {error}</p>
            )}

            {isGenerating && (
                <GenerationProgress label={generatingLabel || 'Generating your draft'} seconds={seconds} onCancel={onCancel} tone={accentTone} />
            )}

            {!isGenerating && list.length > 0 && (
                <div>
                    <p className="mb-2 text-[12px] font-bold text-gray-500">Try an example</p>
                    <div className="flex flex-wrap gap-2">
                        {list.map((ex) => (
                            <button
                                key={ex}
                                type="button"
                                onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
                                className="min-h-10 max-w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-left text-[13px] font-medium leading-snug text-gray-700 transition-colors hover:border-black/20 hover:text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
                            >
                                {ex}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIPromptBox;
