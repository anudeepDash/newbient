import React, { useEffect, useMemo, useRef, useState } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import X from 'lucide-react/dist/esm/icons/x';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Lock from 'lucide-react/dist/esm/icons/lock';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import Loader from 'lucide-react/dist/esm/icons/loader';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import { FILE_ACCEPT, NO_ANSWER_TYPES, formClosedReason, validateAnswers } from './formSchema';
import { submitFormResponse } from './formResponses';
import ThemedSelect from '../ThemedSelect';

/*
 * Renders a built-in form for people to fill (on /forms/:id) and as the live
 * preview in the form builder (`preview` — fully interactive, never submits).
 */

const inputCls = 'h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[15px] font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[var(--form-accent)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-600';
const draftKey = (id) => `nb_form_draft_${id}`;

const formatBytes = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

const FileInput = ({ field, value, onChange, disabled, accent }) => {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [problem, setProblem] = useState('');
    const files = Array.isArray(value) ? value : value ? [value] : [];
    const accept = FILE_ACCEPT[field.accept] || FILE_ACCEPT.any;
    const maxMb = Number(field.maxSizeMb) || 10;

    const pick = async (file) => {
        if (!file) return;
        setProblem('');
        if (file.size > maxMb * 1024 * 1024) { setProblem(`That file is ${formatBytes(file.size)}. The limit is ${maxMb} MB.`); return; }
        if (field.accept === 'image' && !file.type.startsWith('image/')) { setProblem('Please choose an image.'); return; }
        if (field.accept === 'pdf' && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setProblem('Please choose a PDF.'); return; }
        if (disabled) { onChange([{ url: 'https://example.com/preview', name: file.name, size: file.size, type: file.type }]); return; }
        setUploading(true);
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            if (!url) throw new Error('No URL');
            onChange([{ url, name: file.name, size: file.size, type: file.type }]);
        } catch {
            setProblem("Couldn't upload the file. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            {files.length ? (
                <div className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1f`, color: accent }}><FileText size={18} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">{files[0].name || 'Uploaded file'}</p>
                        {files[0].size ? <p className="text-[12px] text-gray-500">{formatBytes(files[0].size)}</p> : null}
                    </div>
                    <button type="button" onClick={() => onChange([])} aria-label="Remove file" className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/5"><X size={16} /></button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/10 px-4 py-6 text-[14px] font-semibold text-gray-500 transition-colors hover:border-black/25 disabled:opacity-60 dark:border-white/10 dark:hover:border-white/25"
                >
                    {uploading ? <><Loader size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Choose a file</>}
                </button>
            )}
            <p className="mt-1 text-[12px] text-gray-500">{accept.label} · up to {maxMb} MB</p>
            {problem && <p role="alert" className="mt-1 text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
            <input ref={inputRef} type="file" accept={accept.accept} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
    );
};

const Question = ({ field, value, onChange, error, preview, accent }) => {
    if (field.type === 'heading') {
        return (
            <div className="pt-2">
                <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">{field.label}</h3>
                {field.help && <p className="mt-1 text-[14px] text-gray-500">{field.help}</p>}
                <div className="mt-3 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
            </div>
        );
    }
    const id = `q_${field.id}`;
    const options = field.options || [];
    let control;
    switch (field.type) {
        case 'long':
            control = <textarea id={id} rows={4} className={cn(inputCls, 'h-auto py-3')} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || ''} />;
            break;
        case 'radio':
            control = (
                <div className="space-y-2" role="radiogroup" aria-labelledby={`${id}_label`}>
                    {options.map(opt => (
                        <label key={opt} className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[15px] transition-colors', value === opt ? 'border-[var(--form-accent)] bg-[var(--form-accent-soft)]' : 'border-black/10 dark:border-white/10')}>
                            <input type="radio" name={id} checked={value === opt} onChange={() => onChange(opt)} className="h-4 w-4" style={{ accentColor: accent }} />
                            <span>{opt}</span>
                        </label>
                    ))}
                </div>
            );
            break;
        case 'checkbox': {
            const list = Array.isArray(value) ? value : [];
            control = (
                <div className="space-y-2">
                    {options.map(opt => {
                        const on = list.includes(opt);
                        return (
                            <label key={opt} className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[15px] transition-colors', on ? 'border-[var(--form-accent)] bg-[var(--form-accent-soft)]' : 'border-black/10 dark:border-white/10')}>
                                <input type="checkbox" checked={on} onChange={() => onChange(on ? list.filter(x => x !== opt) : [...list, opt])} className="h-4 w-4 rounded" style={{ accentColor: accent }} />
                                <span>{opt}</span>
                            </label>
                        );
                    })}
                </div>
            );
            break;
        }
        case 'select':
            control = (
                <ThemedSelect id={id} className={cn(inputCls, 'cursor-pointer')} value={value || ''} onChange={(e) => onChange(e.target.value)}>
                    <option value="">Choose…</option>
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </ThemedSelect>
            );
            break;
        case 'file':
            control = <FileInput field={field} value={value} onChange={onChange} disabled={preview} accent={accent} />;
            break;
        default: {
            const typeMap = { email: 'email', phone: 'tel', number: 'number', date: 'date', url: 'url' };
            const modeMap = { email: 'email', phone: 'tel', number: 'decimal', url: 'url' };
            control = (
                <input
                    id={id}
                    type={typeMap[field.type] || 'text'}
                    inputMode={modeMap[field.type]}
                    autoCapitalize={['email', 'url'].includes(field.type) ? 'off' : undefined}
                    autoComplete={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : undefined}
                    min={field.type === 'number' && field.min !== '' ? field.min : undefined}
                    max={field.type === 'number' && field.max !== '' ? field.max : undefined}
                    className={inputCls}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder || (field.type === 'url' ? 'https://' : '')}
                />
            );
        }
    }
    return (
        <div id={`wrap_${field.id}`} className="scroll-mt-28">
            <label id={`${id}_label`} htmlFor={id} className="mb-1.5 block text-[15px] font-semibold text-gray-900 dark:text-white">
                {field.label || 'Untitled question'}
                {field.required && <span className="ml-1 text-red-500" aria-label="required">*</span>}
            </label>
            {field.help && <p className="-mt-0.5 mb-2 text-[13px] text-gray-500">{field.help}</p>}
            {control}
            {error && <p role="alert" className="mt-1.5 text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

/* prefill: { [fieldId]: value } filled in where the person hasn't answered yet (e.g. from their profile). */
const FormRenderer = ({ form, preview = false, onSubmitted, prefill, className }) => {
    const user = useStore(s => s.user);
    const setAuthModal = useStore(s => s.setAuthModal);
    const accent = form.highlightColor || '#FF4F8B';
    const fields = useMemo(() => form.fields || [], [form.fields]);

    const [answers, setAnswers] = useState(() => {
        if (preview) return {};
        try { return JSON.parse(window.localStorage.getItem(draftKey(form.id)) || '{}') || {}; } catch { return {}; }
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [problem, setProblem] = useState('');

    // Fill name and email from the signed-in account when empty.
    useEffect(() => {
        if (preview || !user) return;
        setAnswers(prev => {
            const next = { ...prev };
            const email = fields.find(f => f.type === 'email');
            const name = fields.find(f => f.type === 'short' && /name/i.test(f.label || ''));
            if (email && !next[email.id] && user.email) next[email.id] = user.email;
            if (name && !next[name.id] && user.displayName) next[name.id] = user.displayName;
            return next;
        });
    }, [user, fields, preview]);

    useEffect(() => {
        if (preview || !prefill) return;
        setAnswers(prev => {
            const next = { ...prev };
            Object.entries(prefill).forEach(([id, v]) => {
                if (v && !next[id] && fields.some(f => f.id === id)) next[id] = v;
            });
            return next;
        });
    }, [prefill, fields, preview]);

    // Keep an unsent draft on this device (files excluded).
    useEffect(() => {
        if (preview || done) return;
        try {
            const keep = Object.fromEntries(Object.entries(answers).filter(([k]) => fields.find(f => f.id === k)?.type !== 'file'));
            window.localStorage.setItem(draftKey(form.id), JSON.stringify(keep));
        } catch { /* private mode */ }
    }, [answers, preview, done, form.id, fields]);

    const closed = preview ? '' : formClosedReason(form);
    const needsSignIn = !preview && !user && (form.requireSignIn || form.onePerPerson);

    const setAnswer = (id, value) => {
        setAnswers(prev => ({ ...prev, [id]: value }));
        if (errors[id]) setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    const submit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setProblem('');
        const { errors: found } = validateAnswers(fields, answers);
        if (Object.keys(found).length) {
            setErrors(found);
            const first = fields.find(f => found[f.id]);
            document.getElementById(`wrap_${first?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        if (preview) { setDone(true); return; }
        setSubmitting(true);
        try {
            await submitFormResponse(form, answers, user);
            try { window.localStorage.removeItem(draftKey(form.id)); } catch { /* ignore */ }
            setDone(true);
            onSubmitted?.();
        } catch (err) {
            if (err.code === 'INVALID' && err.errors) setErrors(err.errors);
            else if (err.code === 'SIGN_IN') setAuthModal?.(true);
            setProblem(err.code === 'DUPLICATE' || err.code === 'CLOSED' || err.code === 'SIGN_IN' || err.code === 'INVALID'
                ? err.message
                : "Couldn't send your answers. Please check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const style = { '--form-accent': accent, '--form-accent-soft': `${accent}14` };

    if (closed) {
        return (
            <div className={cn('px-6 py-14 text-center', className)} style={style}>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5 text-gray-500 dark:bg-white/5"><Lock size={22} /></span>
                <h3 className="mt-4 text-[18px] font-bold">{closed}</h3>
                <p className="mt-1 text-[14px] text-gray-500">Thanks for your interest. Keep an eye on the community page for the next one.</p>
            </div>
        );
    }

    if (done) {
        return (
            <div className={cn('px-6 py-14 text-center', className)} style={style}>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}1f`, color: accent }}><CheckCircle2 size={24} /></span>
                <h3 className="mt-4 text-[18px] font-bold">{preview ? 'Preview: answers look good' : 'Thanks, your answers are in'}</h3>
                <p className="mx-auto mt-1 max-w-md whitespace-pre-line text-[14px] text-gray-500">{form.confirmationMessage || "We'll be in touch if we need anything else."}</p>
                {(preview || !form.onePerPerson) && (
                    <button type="button" onClick={() => { setAnswers({}); setErrors({}); setDone(false); }} className="mt-5 h-11 rounded-xl border border-black/10 px-4 text-[14px] font-semibold dark:border-white/10">
                        {preview ? 'Back to the form' : 'Send another response'}
                    </button>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className={cn('space-y-6 p-5 sm:p-8', className)} style={style}>
            {needsSignIn && (
                <div className="flex flex-col items-start gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10 sm:flex-row sm:items-center">
                    <p className="flex-1 text-[14px] text-gray-600 dark:text-zinc-300">Sign in to fill this form. It takes a few seconds and keeps your answers linked to you.</p>
                    <button type="button" onClick={() => setAuthModal?.(true)} className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-bold text-black" style={{ backgroundColor: accent }}>
                        <LogIn size={15} /> Sign in
                    </button>
                </div>
            )}
            {fields.map(field => (
                <Question key={field.id} field={field} value={answers[field.id]} onChange={(v) => setAnswer(field.id, v)} error={errors[field.id]} preview={preview} accent={accent} />
            ))}
            {fields.some(f => f.required && !NO_ANSWER_TYPES.includes(f.type)) && <p className="text-[12px] text-gray-500"><span className="text-red-500">*</span> Required</p>}
            {problem && <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-3 text-[14px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
            <button
                type="submit"
                disabled={submitting || needsSignIn}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-black transition-opacity disabled:opacity-50 sm:w-auto sm:px-8"
                style={{ backgroundColor: accent }}
            >
                {submitting ? <><Loader size={16} className="animate-spin" /> Sending…</> : (form.submitLabel || 'Submit')}
            </button>
        </form>
    );
};

export default FormRenderer;
