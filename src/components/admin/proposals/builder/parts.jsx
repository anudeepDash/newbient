import React, { useId } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { cn } from '../../../../lib/utils';
import { useAccent } from '../../theme';
import { fieldCls, areaCls } from '../../uploads/UploadKit';
import RichEditor from '../../RichEditor';

/*
 * Small form pieces for the proposal builder. All defined at module level so
 * typing never remounts an input (and never loses focus).
 */

export const RefineButton = ({ onClick, label = 'Improve' }) => {
    const a = useAccent();
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn('-my-1 inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[12px] font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/10', a.text)}
        >
            <Sparkles size={13} /> {label}
        </button>
    );
};

export const FieldHead = ({ htmlFor, label, optional, onRefine, extra }) => (
    <div className="mb-1 flex min-h-[20px] items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[12px] font-bold text-gray-500">
            {label}{optional && <span className="font-medium"> (optional)</span>}
        </label>
        <div className="flex items-center gap-1">
            {extra}
            {onRefine && <RefineButton onClick={onRefine} />}
        </div>
    </div>
);

const Hint = ({ children }) => (children ? <p className="mt-1 text-[11.5px] leading-snug text-gray-500">{children}</p> : null);

/** One-line text field. `onChange` receives the value. */
export const TextInput = ({ label, value, onChange, optional, hint, onRefine, className, inputClassName, ...rest }) => {
    const id = useId();
    return (
        <div className={cn('min-w-0', className)}>
            {label && <FieldHead htmlFor={id} label={label} optional={optional} onRefine={onRefine} />}
            <input id={id} className={cn(fieldCls, inputClassName)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
            <Hint>{hint}</Hint>
        </div>
    );
};

export const TextArea = ({ label, value, onChange, optional, hint, onRefine, rows = 4, className, ...rest }) => {
    const id = useId();
    return (
        <div className={cn('min-w-0', className)}>
            {label && <FieldHead htmlFor={id} label={label} optional={optional} onRefine={onRefine} />}
            <textarea id={id} rows={rows} className={cn(areaCls, 'resize-y leading-relaxed')} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
            <Hint>{hint}</Hint>
        </div>
    );
};

/** Formatted text (bold, lists, links). Stored as HTML. */
export const RichField = ({ label, value, onChange, onRefine, hint, placeholder, minHeight = 160, optional }) => (
    <div className="min-w-0">
        <div className="mb-1 flex min-h-[20px] items-center justify-between gap-2">
            <span className="text-[12px] font-bold text-gray-500">{label}{optional && <span className="font-medium"> (optional)</span>}</span>
            {onRefine && <RefineButton onClick={onRefine} />}
        </div>
        <RichEditor label={label} value={value || ''} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />
        <Hint>{hint}</Hint>
    </div>
);

/** Numbers: keeps '' while typing so a cleared box doesn't snap back to 0. */
export const MoneyInput = ({ label, value, onChange, hint, optional, prefix = '₹', ...rest }) => {
    const id = useId();
    return (
        <div className="min-w-0">
            {label && <FieldHead htmlFor={id} label={label} optional={optional} />}
            <div className="relative">
                {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-gray-400">{prefix}</span>}
                <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    className={cn(fieldCls, prefix && 'pl-8', 'tabular-nums')}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    {...rest}
                />
            </div>
            <Hint>{hint}</Hint>
        </div>
    );
};

export const IconButton = ({ label, onClick, disabled, danger, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors disabled:opacity-25',
            danger ? 'hover:bg-red-500/10 hover:text-red-500' : 'hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white'
        )}
    >
        {children}
    </button>
);

/** Move up / move down / copy / remove for an item in a list. */
export const RowActions = ({ index, count, onMove, onDuplicate, onRemove, removeLabel = 'Remove' }) => (
    <div className="flex items-center">
        {onMove && (
            <>
                <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}><ChevronUp size={16} /></IconButton>
                <IconButton label="Move down" disabled={index === count - 1} onClick={() => onMove(index, 1)}><ChevronDown size={16} /></IconButton>
            </>
        )}
        {onDuplicate && <IconButton label="Duplicate" onClick={() => onDuplicate(index)}><Copy size={15} /></IconButton>}
        {onRemove && <IconButton label={removeLabel} danger onClick={() => onRemove(index)}><Trash2 size={15} /></IconButton>}
    </div>
);

/** A numbered card for one entry in a list (a step, a row, a page). */
export const ListCard = ({ badge, title, actions, children, className }) => {
    const a = useAccent();
    return (
        <div className={cn('rounded-2xl border border-black/[0.08] bg-black/[0.015] p-3 dark:border-white/[0.08] dark:bg-white/[0.02] sm:p-4', className)}>
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {badge !== undefined && <span className={cn('flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5 text-[12px] font-bold tabular-nums', a.chip)}>{badge}</span>}
                    {title && <span className="truncate text-[13px] font-bold text-gray-600 dark:text-zinc-300">{title}</span>}
                </div>
                {actions}
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
};

export const AddButton = ({ onClick, children, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 text-[13px] font-bold text-gray-600 transition-colors hover:border-black/25 hover:text-gray-900 disabled:opacity-40 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/25 dark:hover:text-white"
    >
        <Plus size={16} /> {children}
    </button>
);

/** Quick-pick chips (dates, rates). */
export const Chips = ({ options, value, onPick }) => {
    const a = useAccent();
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map(opt => (
                <button
                    key={opt.label}
                    type="button"
                    onClick={() => onPick(opt.value)}
                    aria-pressed={value === opt.value}
                    className={cn('h-9 rounded-full border px-3 text-[12px] font-semibold transition-colors',
                        value === opt.value ? cn(a.border, a.soft, a.text) : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20')}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

/** Tinted box for an optional block on the page (a callout, a note). */
export const OptionalBlock = ({ children, on }) => (
    <div className={cn('rounded-2xl border p-3 transition-colors sm:p-4', on ? 'border-black/[0.08] dark:border-white/[0.08]' : 'border-dashed border-black/[0.08] dark:border-white/[0.08]')}>
        <div className="space-y-3">{children}</div>
    </div>
);

/** Move an array element by delta, returning a new array. */
export const moveItem = (list, index, delta) => {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return list;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
};
