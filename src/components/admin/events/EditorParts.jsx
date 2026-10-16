import React, { useState } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '../../../lib/utils';
import { fieldCls } from '../uploads/UploadKit';

/* Pieces of the event editor, in the same style as the invoice builder. */

export const BuilderCard = ({ id, title, hint, action, children, className }) => (
    <section id={id} className={cn('scroll-mt-24 rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-5', className)}>
        <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h3 className="text-[15px] font-bold">{title}</h3>
                {hint && <p className="text-[12px] text-gray-500">{hint}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
);

/** "2026-10-18T20:00" (or an ISO string, or a bare date) → { date, time } in local time. */
export const splitDateTime = (value) => {
    const s = typeof value === 'string' ? value : '';
    if (!s) return { date: '', time: '' };
    const local = s.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?(?::\d{2}(?:\.\d+)?)?$/);
    if (local) return { date: local[1], time: local[2] || '' };
    const d = new Date(s);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    const pad = (n) => String(n).padStart(2, '0');
    return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

const Slider = ({ label, value, min, max, step, onChange, suffix = '' }) => (
    <label className="block">
        <span className="mb-1 flex justify-between text-[12px] font-semibold text-gray-500">
            <span>{label}</span>
            <span className="tabular-nums">{value}{suffix}</span>
        </span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="h-8 w-full cursor-pointer accent-emerald-500" />
    </label>
);

/**
 * An image the event uses (card thumbnail, banner, venue map): upload, paste
 * or link, with optional framing controls (zoom and position).
 */
export const ImageSlot = ({
    label, hint, aspect = 'aspect-[4/5]', previewUrl, url, onFile, onUrl, onClear, onPaste,
    transform, onTransform, contain = false,
}) => {
    const [framing, setFraming] = useState(false);
    const t = transform || { scale: 1, x: 0, y: 0 };
    return (
        <div className="space-y-2" onPaste={onPaste}>
            <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-gray-500">{label}</span>
                {previewUrl && <button type="button" onClick={onClear} className="-my-2 py-2 pl-3 text-[12px] font-semibold text-red-500">Remove</button>}
            </div>
            <label className={cn('relative block cursor-pointer overflow-hidden rounded-xl border border-black/10 bg-gray-50 dark:border-white/10 dark:bg-white/[0.04]', aspect)}>
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt=""
                        className={cn('h-full w-full', contain ? 'object-contain' : 'object-cover')}
                        style={onTransform ? { transform: `scale(${t.scale ?? 1})`, objectPosition: `${50 + (t.x || 0)}% ${50 + (t.y || 0)}%` } : undefined}
                    />
                ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-gray-500">
                        <Upload size={20} />
                        <span className="text-[13px] font-semibold">Upload or paste</span>
                        {hint && <span className="text-[11px]">{hint}</span>}
                    </span>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
            </label>
            <input className={cn(fieldCls, 'h-11 text-[13px] font-medium')} placeholder="…or paste an image link" value={url || ''} onChange={(e) => onUrl(e.target.value)} onPaste={onPaste} inputMode="url" autoCapitalize="off" />
            {onTransform && previewUrl && (
                <div>
                    <button type="button" onClick={() => setFraming(v => !v)} className="flex items-center gap-1 text-[12px] font-semibold text-gray-500">
                        Adjust framing <ChevronDown size={13} className={cn('transition-transform', framing && 'rotate-180')} />
                    </button>
                    {framing && (
                        <div className="mt-2 space-y-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                            <Slider label="Zoom" value={Number((t.scale ?? 1).toFixed(2))} min={0.1} max={3} step={0.01} suffix="×" onChange={(v) => onTransform({ ...t, scale: v })} />
                            <Slider label="Left / right" value={t.x || 0} min={-100} max={100} step={1} suffix="%" onChange={(v) => onTransform({ ...t, x: v })} />
                            <Slider label="Up / down" value={t.y || 0} min={-100} max={100} step={1} suffix="%" onChange={(v) => onTransform({ ...t, y: v })} />
                            <button type="button" onClick={() => onTransform({ scale: 1, x: 0, y: 0 })} className="flex items-center gap-1 text-[12px] font-semibold text-gray-500"><RotateCcw size={12} /> Reset</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
