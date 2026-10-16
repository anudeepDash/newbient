import React, { useRef } from 'react';
import Type from 'lucide-react/dist/esm/icons/type';
import AlignLeft from 'lucide-react/dist/esm/icons/align-left';
import AtSign from 'lucide-react/dist/esm/icons/at-sign';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Hash from 'lucide-react/dist/esm/icons/hash';
import CircleDot from 'lucide-react/dist/esm/icons/circle-dot';
import CheckSquare from 'lucide-react/dist/esm/icons/check-square';
import List from 'lucide-react/dist/esm/icons/list';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import Heading from 'lucide-react/dist/esm/icons/heading';
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Badge } from '../ui';
import { Field, Toggle, Choice, fieldCls } from '../uploads/UploadKit';
import { CHOICE_TYPES, FIELD_TYPES, FIELD_TYPE_MAP, FILE_ACCEPT } from './formSchema';
import ThemedSelect from '../ThemedSelect';

export const FIELD_ICONS = {
    short: Type, long: AlignLeft, email: AtSign, phone: Phone, number: Hash, radio: CircleDot,
    checkbox: CheckSquare, select: List, date: Calendar, url: Link2, file: Paperclip, heading: Heading,
};

/** The buttons that add a question. */
export const FieldPalette = ({ onAdd, compact }) => (
    <div className={cn('grid gap-2', compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4')}>
        {FIELD_TYPES.map(t => {
            const Icon = FIELD_ICONS[t.type];
            return (
                <button
                    key={t.type}
                    type="button"
                    onClick={() => onAdd(t.type)}
                    className="flex min-h-[52px] items-center gap-2.5 rounded-xl border border-black/[0.08] bg-white px-2.5 py-2 text-left transition-colors hover:border-black/20 active:scale-[0.98] dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/20"
                >
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent(t.tone).chip)}><Icon size={16} /></span>
                    <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold">{t.label}</span>
                        {!compact && <span className="block truncate text-[11px] text-gray-500">{t.hint}</span>}
                    </span>
                </button>
            );
        })}
    </div>
);

const iconBtn = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 disabled:opacity-25 dark:hover:bg-white/5 dark:hover:text-white';

const OptionsEditor = ({ options, onChange }) => {
    const refs = useRef([]);
    const update = (i, v) => onChange(options.map((o, j) => (j === i ? v : o)));
    const add = (after = options.length - 1) => {
        const next = [...options];
        next.splice(after + 1, 0, '');
        onChange(next);
        setTimeout(() => refs.current[after + 1]?.focus(), 0);
    };
    const move = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= options.length) return;
        const next = [...options];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    const pasteList = (e, i) => {
        const text = e.clipboardData?.getData('text') || '';
        if (!text.includes('\n')) return;
        e.preventDefault();
        const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const next = [...options];
        next.splice(i, 1, ...lines);
        onChange(next);
    };
    return (
        <div className="space-y-2">
            {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <input
                        ref={el => { refs.current[i] = el; }}
                        className={cn(fieldCls, 'h-11 text-[14px]')}
                        value={opt}
                        placeholder={`Option ${i + 1}`}
                        onChange={(e) => update(i, e.target.value)}
                        onPaste={(e) => pasteList(e, i)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(i); } }}
                    />
                    <button type="button" className={cn(iconBtn, 'hidden sm:flex')} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move option up"><ArrowUp size={14} /></button>
                    <button type="button" className={cn(iconBtn, 'hidden sm:flex')} onClick={() => move(i, 1)} disabled={i === options.length - 1} aria-label="Move option down"><ArrowDown size={14} /></button>
                    <button type="button" className={iconBtn} onClick={() => onChange(options.filter((_, j) => j !== i))} disabled={options.length <= 1} aria-label="Remove option"><X size={15} /></button>
                </div>
            ))}
            <button type="button" onClick={() => add()} className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-indigo-600 dark:text-indigo-300">
                <Plus size={14} /> Add option
            </button>
            <p className="text-[11px] text-gray-500">Tip: paste a list (one per line) into any option to add them all.</p>
        </div>
    );
};

/**
 * One question in the builder. Collapsed it shows the title and type;
 * expanded it is the settings panel for that question.
 */
export const QuestionCard = ({
    field, index, total, expanded, onToggle, onChange, onMove, onDuplicate, onDelete, problem,
    dragProps, dragOver,
}) => {
    const meta = FIELD_TYPE_MAP[field.type] || FIELD_TYPE_MAP.short;
    const Icon = FIELD_ICONS[field.type] || Type;
    const isHeading = field.type === 'heading';
    const changeType = (type) => {
        const patch = { type };
        if (CHOICE_TYPES.includes(type) && !(field.options || []).length) patch.options = ['Option 1', 'Option 2'];
        if (type === 'file') { patch.accept = field.accept || 'any'; patch.maxSizeMb = field.maxSizeMb || 10; }
        if (type === 'heading') patch.required = false;
        onChange(patch);
    };

    return (
        <div
            {...dragProps}
            className={cn(
                'rounded-2xl border bg-white transition-colors dark:bg-white/[0.03]',
                expanded ? cn(accent('indigo').border, 'shadow-sm') : problem ? 'border-red-500/40' : 'border-black/[0.08] dark:border-white/[0.08]',
                dragOver && 'border-dashed border-indigo-500'
            )}
        >
            <div className="flex items-center gap-1 p-1.5 pr-2">
                <span className="hidden h-10 w-7 cursor-grab items-center justify-center text-gray-400 active:cursor-grabbing sm:flex" title="Drag to reorder" aria-hidden="true">
                    <GripVertical size={16} />
                </span>
                <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent(meta.tone).chip)}><Icon size={16} /></span>
                    <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[14px] font-bold', !field.label && 'text-gray-400')}>
                            {isHeading ? '' : `${index + 1}. `}{field.label || 'Untitled question'}
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                            {meta.label}
                            {field.required && <Badge tone="rose">Required</Badge>}
                            {problem && !expanded && <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400"><AlertCircle size={12} /> Needs a fix</span>}
                        </span>
                    </span>
                    <ChevronDown size={16} className={cn('shrink-0 text-gray-400 transition-transform', expanded && 'rotate-180')} />
                </button>
                <button type="button" className={iconBtn} onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"><ArrowUp size={15} /></button>
                <button type="button" className={iconBtn} onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move down"><ArrowDown size={15} /></button>
            </div>

            {expanded && (
                <div className="space-y-4 border-t border-black/[0.06] p-4 dark:border-white/[0.06]">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                        <Field label={isHeading ? 'Section title' : 'Question'}>
                            <input className={fieldCls} value={field.label} onChange={(e) => onChange({ label: e.target.value })} placeholder={isHeading ? 'e.g. About you' : 'e.g. What is your Instagram handle?'} autoFocus={!field.label} />
                        </Field>
                        <Field label="Type">
                            <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={field.type} onChange={(e) => changeType(e.target.value)}>
                                {FIELD_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                            </ThemedSelect>
                        </Field>
                    </div>
                    <Field label={isHeading ? 'Text under the title' : 'Help text'} optional>
                        <input className={fieldCls} value={field.help || ''} onChange={(e) => onChange({ help: e.target.value })} placeholder={isHeading ? 'A line to explain this part' : 'Shown under the question'} />
                    </Field>

                    {['short', 'long', 'email', 'phone', 'number', 'url'].includes(field.type) && (
                        <Field label="Placeholder" optional>
                            <input className={fieldCls} value={field.placeholder || ''} onChange={(e) => onChange({ placeholder: e.target.value })} placeholder="Example answer shown in grey" />
                        </Field>
                    )}

                    {CHOICE_TYPES.includes(field.type) && (
                        <div>
                            <p className="mb-1.5 text-[12px] font-bold text-gray-500">Options</p>
                            <OptionsEditor options={field.options || []} onChange={(options) => onChange({ options })} />
                        </div>
                    )}

                    {field.type === 'number' && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Lowest" optional><input className={fieldCls} type="number" inputMode="decimal" value={field.min ?? ''} onChange={(e) => onChange({ min: e.target.value })} /></Field>
                            <Field label="Highest" optional><input className={fieldCls} type="number" inputMode="decimal" value={field.max ?? ''} onChange={(e) => onChange({ max: e.target.value })} /></Field>
                        </div>
                    )}

                    {field.type === 'file' && (
                        <div className="space-y-3">
                            <div>
                                <p className="mb-1.5 text-[12px] font-bold text-gray-500">Allowed files</p>
                                <Choice value={field.accept || 'any'} onChange={(v) => onChange({ accept: v })} options={Object.entries(FILE_ACCEPT).map(([value, o]) => ({ value, label: value === 'any' ? 'Any' : o.label, hint: value === 'any' ? 'Images, PDF, docs' : null }))} />
                            </div>
                            <Field label="Largest file">
                                <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={field.maxSizeMb || 10} onChange={(e) => onChange({ maxSizeMb: Number(e.target.value) })}>
                                    {[2, 5, 10, 25].map(n => <option key={n} value={n}>{n} MB</option>)}
                                </ThemedSelect>
                            </Field>
                        </div>
                    )}

                    {!isHeading && <Toggle label="Required" hint="People can't submit without answering" checked={Boolean(field.required)} onChange={(v) => onChange({ required: v })} />}

                    {problem && <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-red-600 dark:text-red-400"><AlertCircle size={14} /> {problem}</p>}

                    <div className="flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                        <button type="button" onClick={onDuplicate} className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"><Copy size={14} /> Duplicate</button>
                        <button type="button" onClick={onDelete} className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400"><Trash2 size={14} /> Delete</button>
                        <button type="button" onClick={onToggle} className="ml-auto h-10 rounded-xl px-3 text-[13px] font-semibold text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5">Done</button>
                    </div>
                </div>
            )}
        </div>
    );
};
