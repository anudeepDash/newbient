import React, { useCallback, useRef, useState } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { cn } from '../../../lib/utils';
import { inspectPdf, isPdfFile } from '../../../lib/pdfInspect';
import SignatureModal from '../../ui/SignatureModal';

/*
 * Shared pieces for the "add a document made elsewhere" sheets (invoices,
 * proposals, contracts): the drop zone with a real first-page preview, form
 * fields that show what was read from the PDF, and the signature box.
 */

export const fieldCls = 'h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[15px] font-semibold text-gray-900 outline-none transition-colors placeholder:font-medium placeholder:text-gray-400 focus:border-neon-green/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-600';
export const areaCls = 'w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-[15px] font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-600';

export const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (typeof bytes === 'string') return bytes;
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const Section = ({ title, hint, children, className }) => (
    <section className={cn('space-y-3', className)}>
        {(title || hint) && (
            <div>
                {title && <h3 className="text-[13px] font-bold">{title}</h3>}
                {hint && <p className="text-[12px] text-gray-500">{hint}</p>}
            </div>
        )}
        {children}
    </section>
);

/** Label + control. `auto` marks a value that was read from the PDF. */
export const Field = ({ label, optional, hint, auto, children, className }) => (
    <label className={cn('block min-w-0', className)}>
        <span className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-gray-500">
            {label}
            {optional && <span className="font-medium">(optional)</span>}
            {auto && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-neon-green/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-neon-green">
                    <Sparkles size={10} /> From PDF
                </span>
            )}
        </span>
        {children}
        {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
);

export const Toggle = ({ label, hint, checked, onChange }) => (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-1 text-left">
        <span className="min-w-0">
            <span className="block text-[14px] font-semibold">{label}</span>
            {hint && <span className="block text-[12px] text-gray-500">{hint}</span>}
        </span>
        <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-emerald-500 dark:bg-neon-green' : 'bg-black/15 dark:bg-white/15')}>
            <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left]', checked ? 'left-[22px]' : 'left-0.5')} />
        </span>
    </button>
);

export const Choice = ({ value, onChange, options }) => (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(opt => (
            <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                    'min-h-12 rounded-xl border px-2 py-2 text-left transition-colors',
                    value === opt.value
                        ? 'border-emerald-500/60 bg-neon-green/[0.08] dark:border-neon-green/50'
                        : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20'
                )}
            >
                <span className="block text-[13px] font-bold">{opt.label}</span>
                {opt.hint && <span className="block text-[11px] leading-snug text-gray-500">{opt.hint}</span>}
            </button>
        ))}
    </div>
);

/**
 * Holds the picked file and what was read from it. `onRead(info)` runs once
 * the PDF has been read so the form can fill empty fields.
 */
export const useDocumentIntake = ({ maxMb = 35, onRead } = {}) => {
    const [file, setFile] = useState(null);
    const [info, setInfo] = useState(null);
    const [reading, setReading] = useState(false);
    const [problem, setProblem] = useState('');
    const token = useRef(0);

    const pick = useCallback(async (picked) => {
        if (!picked) return;
        if (picked.size > maxMb * 1024 * 1024) {
            setProblem(`That file is ${formatBytes(picked.size)}. The limit is ${maxMb} MB.`);
            return;
        }
        setProblem('');
        setFile(picked);
        setInfo(null);
        if (!isPdfFile(picked)) return;
        const mine = ++token.current;
        setReading(true);
        const result = await inspectPdf(picked);
        if (mine !== token.current) return;
        setReading(false);
        setInfo(result);
        if (result) onRead?.(result, picked);
    }, [maxMb, onRead]);

    const clear = useCallback(() => {
        token.current++;
        setFile(null);
        setInfo(null);
        setReading(false);
        setProblem('');
    }, []);

    return { file, info, reading, problem, pick, clear, setFile };
};

/**
 * Drop zone. Before a file: a big target. After: the first page, page count,
 * size, and Replace. `existing` = { name, size, url } for a saved document.
 */
export const DocumentDrop = ({ intake, existing, accept = 'application/pdf,.pdf', label = 'Drop the PDF here', sub = 'or tap to choose · up to 35 MB', disabled }) => {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const { file, info, reading, problem, pick } = intake;
    const shown = file || existing;

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled && e.dataTransfer.files?.[0]) pick(e.dataTransfer.files[0]);
    };

    const input = (
        <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled}
            onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
        />
    );

    if (!shown) {
        return (
            <div>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                        'flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors',
                        dragging ? 'border-emerald-500 bg-neon-green/[0.06] dark:border-neon-green' : 'border-black/10 hover:border-black/25 dark:border-white/10 dark:hover:border-white/25'
                    )}
                >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 text-gray-500 dark:bg-white/[0.06] dark:text-zinc-300"><Upload size={20} /></span>
                    <span>
                        <span className="block text-[15px] font-bold">{label}</span>
                        <span className="mt-0.5 block text-[12px] text-gray-500">{sub}</span>
                    </span>
                </button>
                {problem && <p role="alert" className="mt-2 text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
                {input}
            </div>
        );
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn('flex gap-4 rounded-2xl border p-3 transition-colors', dragging ? 'border-emerald-500 dark:border-neon-green' : 'border-black/[0.08] dark:border-white/[0.08]')}
        >
            <div className="relative flex h-[132px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-gray-50 dark:border-white/10 dark:bg-white/[0.04]">
                {info?.thumbnail ? (
                    <img src={info.thumbnail} alt="First page" className="h-full w-full object-cover object-top" />
                ) : reading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                ) : (
                    <FileText size={26} className="text-gray-400" />
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
                <p className="break-words text-[14px] font-bold leading-snug">{shown.name}</p>
                <p className="mt-1 text-[12px] text-gray-500">
                    {[formatBytes(shown.size), info?.pages ? `${info.pages} page${info.pages === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                </p>
                {reading && <p className="mt-2 text-[12px] font-semibold text-emerald-700 dark:text-neon-green">Reading the document…</p>}
                {!file && existing?.url && (
                    <a href={existing.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 dark:text-neon-blue">
                        Open current file <ExternalLink size={11} />
                    </a>
                )}
                <div className="mt-auto pt-3">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 px-3.5 text-[12px] font-bold hover:border-black/25 disabled:opacity-50 dark:border-white/10 dark:hover:border-white/25"
                    >
                        <RefreshCw size={13} /> Replace
                    </button>
                </div>
                {problem && <p role="alert" className="mt-2 text-[12px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
            </div>
            {input}
        </div>
    );
};

/** Our signature, drawn once and stamped on the document. */
export const SignatureField = ({ value, onChange, label = 'Our signature', hint }) => {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <div className="mb-1 flex items-center justify-between">
                <span className="text-[12px] font-bold text-gray-500">{label} <span className="font-medium">(optional)</span></span>
                {value && <button type="button" onClick={() => onChange(null)} className="-my-2 py-2 pl-3 text-[12px] font-semibold text-red-500">Remove</button>}
            </div>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-20 w-full items-center justify-center rounded-xl border-2 border-dashed border-black/10 bg-white p-2 transition-colors hover:border-black/25 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25"
            >
                {value ? (
                    <img src={value} alt="Signature" className="max-h-full object-contain dark:invert" />
                ) : (
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-500"><PenTool size={15} /> Draw signature</span>
                )}
            </button>
            {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
            <SignatureModal isOpen={open} onClose={() => setOpen(false)} onSave={(data) => { onChange(data); setOpen(false); }} />
        </div>
    );
};

/** Upload progress with the step being done. */
export const UploadProgress = ({ percent, step }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between text-[12px] font-semibold text-gray-500">
            <span>{step}</span>
            <span>{Math.round(percent)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] dark:bg-neon-green" style={{ width: `${percent}%` }} />
        </div>
    </div>
);
