import React, { useRef, useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { cn } from '../../../lib/utils';
import { areaCls, fieldCls } from '../uploads/UploadKit';

/* Small form pieces shared by the studio's edit sheets. */

export const TextInput = ({ value, onChange, className, ...rest }) => (
    <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cn(fieldCls, className)} {...rest} />
);

export const TextArea = ({ value, onChange, rows = 3, className, ...rest }) => (
    <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={rows} className={cn(areaCls, 'resize-y leading-relaxed', className)} {...rest} />
);

/**
 * A list of strings edited as text: one item per line (or per blank-line
 * separated paragraph). Keeps its own text so new lines can be typed freely.
 */
export const LinesArea = ({ value, onChange, paragraphs = false, rows = 4, placeholder, ...rest }) => {
    const sep = paragraphs ? '\n\n' : '\n';
    const [text, setText] = useState(() => (Array.isArray(value) ? value : []).join(sep));
    const split = (t) => (paragraphs ? t.split(/\n\s*\n/) : t.split('\n')).map(s => s.trim()).filter(Boolean);
    return (
        <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); onChange(split(e.target.value)); }}
            rows={rows}
            placeholder={placeholder}
            className={cn(areaCls, 'resize-y leading-relaxed')}
            {...rest}
        />
    );
};

/** Comma-separated list in a single input. */
export const CommaInput = ({ value, onChange, placeholder }) => {
    const [text, setText] = useState(() => (Array.isArray(value) ? value : []).join(', '));
    return (
        <input
            value={text}
            onChange={(e) => { setText(e.target.value); onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean)); }}
            placeholder={placeholder}
            className={fieldCls}
        />
    );
};

/** Repeating rows (deliverables, prices, plan steps) with add and remove. */
export const RowList = ({ items, onChange, makeItem, renderItem, addLabel, emptyText, itemLabel = 'row' }) => {
    const rows = Array.isArray(items) ? items : [];
    // Stable keys so a removed row doesn't hand its text to the next one.
    const keys = useRef([]);
    const seq = useRef(0);
    if (keys.current.length !== rows.length) keys.current = rows.map((_, i) => keys.current[i] || `r${seq.current++}`);
    const update = (idx, patch) => onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    const removeAt = (idx) => { keys.current = keys.current.filter((_, i) => i !== idx); onChange(rows.filter((_, i) => i !== idx)); };
    const add = () => { keys.current = [...keys.current, `r${seq.current++}`]; onChange([...rows, makeItem(rows.length)]); };
    return (
        <div className="space-y-3">
            {rows.length === 0 && emptyText && (
                <p className="rounded-xl border border-dashed border-black/10 px-4 py-3 text-[13px] text-gray-500 dark:border-white/10">{emptyText}</p>
            )}
            {rows.map((row, idx) => (
                <div key={keys.current[idx]} className="rounded-2xl border border-black/[0.08] bg-black/[0.015] p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[12px] font-bold text-gray-500">{itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} {idx + 1}</span>
                        <button
                            type="button"
                            onClick={() => removeAt(idx)}
                            aria-label={`Remove ${itemLabel} ${idx + 1}`}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-500"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                    {renderItem(row, (patch) => update(idx, patch), idx)}
                </div>
            ))}
            <button
                type="button"
                onClick={add}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 text-[13px] font-semibold text-gray-600 transition-colors hover:border-black/30 hover:text-gray-900 dark:border-white/15 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:text-white"
            >
                <Plus size={15} /> {addLabel}
            </button>
        </div>
    );
};

/** Section heading inside a sheet. */
export const SheetSection = ({ title, hint, children }) => (
    <section className="space-y-3 border-b border-black/[0.06] pb-6 last:border-b-0 last:pb-0 dark:border-white/[0.06]">
        <div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">{title}</h3>
            {hint && <p className="text-[12.5px] text-gray-500">{hint}</p>}
        </div>
        {children}
    </section>
);
