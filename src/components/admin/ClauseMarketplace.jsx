import React, { useMemo, useState } from 'react';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Check from 'lucide-react/dist/esm/icons/check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import { CLAUSE_LIBRARY } from '../../services/clauseLibrary';
import { cn } from '../../lib/utils';
import RichEditor from './RichEditor';
import Sheet from './Sheet';
import { Badge, Button, SearchInput } from './ui';
import { fieldCls } from './uploads/UploadKit';
import { ESSENTIAL_CLAUSES, missingEssentialClauses } from './contracts/contractRules';

const STRICTNESS = [
  { value: 'low', label: 'Light', tone: 'green' },
  { value: 'medium', label: 'Standard', tone: 'amber' },
  { value: 'high', label: 'Strict', tone: 'red' },
];

const CATEGORY_TONE = { protection: 'violet', compliance: 'blue', financial: 'green', standard: 'orange', operational: 'orange', custom: 'gray' };
const CATEGORY_LABEL = { protection: 'Protection', compliance: 'Compliance', financial: 'Money', standard: 'General', operational: 'Operations', custom: 'Custom' };

const plain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The contract's clauses: reorder, include or leave out, pick a strictness,
 * edit the wording, and add more from the library (a picker sheet).
 * Only `activeClauses` and `onToggleClause` are required; the rest switch on
 * editing features when passed.
 */
const ClauseMarketplace = ({ activeClauses = [], onToggleClause, onUpdateClause, onRemoveClause, onAddCustom, onRefineClick, disabled = false }) => {
  const clauses = activeClauses || [];
  const [expanded, setExpanded] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [dragIdx, setDragIdx] = useState(null);

  const activeIds = useMemo(() => new Set(clauses.map(c => c.id)), [clauses]);
  const missing = missingEssentialClauses(clauses);
  const canEdit = !disabled && Boolean(onUpdateClause);

  const move = (from, to) => {
    if (!onToggleClause || to < 0 || to >= clauses.length || from === to) return;
    const next = [...clauses];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onToggleClause(null, null, next);
  };

  const remove = (clause) => {
    if (!onRemoveClause) return;
    if (clause.isCustom && plain(clause.content) && !window.confirm(`Remove "${clause.title || 'this clause'}"? Its text will be lost.`)) return;
    onRemoveClause(clause.id);
    if (expanded === clause.id) setExpanded(null);
  };

  const library = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLAUSE_LIBRARY.filter(c => !q || c.title.toLowerCase().includes(q) || String(c.category).includes(q) || plain(c.levels?.medium).toLowerCase().includes(q));
  }, [query]);

  const addCustom = () => {
    if (!customTitle.trim() || !onAddCustom) return;
    onAddCustom(customTitle.trim(), customContent);
    setCustomTitle('');
    setCustomContent('');
    setPickerOpen(false);
  };

  // Phones can't drag; arrows reorder there. Drag works on desktop.
  const dragProps = (idx) => (disabled || !onToggleClause ? {} : {
    draggable: true,
    onDragStart: (e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; },
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => { e.preventDefault(); if (dragIdx !== null) move(dragIdx, idx); setDragIdx(null); },
    onDragEnd: () => setDragIdx(null),
  });

  return (
    <div className="space-y-4">
      {/* Essentials */}
      <div className="flex flex-wrap gap-1.5">
        {ESSENTIAL_CLAUSES.map(e => {
          const isMissing = missing.some(m => m.id === e.id);
          return isMissing && onToggleClause && !disabled ? (
            <button key={e.id} type="button" onClick={() => onToggleClause(e.id, 'add')}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-amber-500/50 px-3 text-[12px] font-semibold text-amber-700 hover:bg-amber-500/10 dark:text-amber-300">
              <Plus size={12} /> {e.label}
            </button>
          ) : (
            <span key={e.id} className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold',
              isMissing ? 'bg-black/[0.04] text-gray-400 dark:bg-white/[0.05]' : 'bg-emerald-500/10 text-emerald-700 dark:text-neon-green')}>
              {!isMissing && <Check size={12} />} {e.label}
            </span>
          );
        })}
      </div>

      {/* Clauses in contract order */}
      {clauses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 px-4 py-8 text-center dark:border-white/10">
          <p className="text-[14px] font-bold">No clauses yet</p>
          <p className="mt-1 text-[12px] text-gray-500">Add the essentials above, or pick from the clause library.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {clauses.map((clause, idx) => {
            const open = expanded === clause.id;
            const included = clause.isActive !== false;
            return (
              <li key={clause.id} {...dragProps(idx)}
                className={cn('overflow-hidden rounded-2xl border bg-white transition-colors dark:bg-white/[0.02]',
                  dragIdx === idx ? 'border-amber-500/50' : 'border-black/[0.08] dark:border-white/[0.08]',
                  !included && 'opacity-60')}>
                <div className="flex items-center gap-2 p-2 pl-3">
                  {!disabled && onToggleClause && <GripVertical size={15} className="hidden shrink-0 cursor-grab text-gray-300 sm:block dark:text-zinc-600" aria-hidden="true" />}
                  <span className="w-6 shrink-0 text-[12px] font-bold tabular-nums text-gray-400">{idx + 1}.</span>
                  <button type="button" onClick={() => setExpanded(open ? null : clause.id)} aria-expanded={open} className="min-w-0 flex-1 py-1.5 text-left">
                    <span className="block truncate text-[14px] font-bold">{clause.title || 'Untitled clause'}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={CATEGORY_TONE[clause.category] || 'gray'}>{CATEGORY_LABEL[clause.category] || 'Custom'}</Badge>
                      {clause.levels && <Badge tone={STRICTNESS.find(s => s.value === clause.strictness)?.tone || 'gray'}>{STRICTNESS.find(s => s.value === clause.strictness)?.label || 'Standard'}</Badge>}
                      {!included && <Badge tone="gray">Left out</Badge>}
                    </span>
                  </button>
                  {!disabled && onToggleClause && (
                    <div className="flex shrink-0 items-center">
                      <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0} aria-label={`Move ${clause.title} up`} className="flex h-10 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-25 dark:hover:bg-white/10"><ArrowUp size={15} /></button>
                      <button type="button" onClick={() => move(idx, idx + 1)} disabled={idx === clauses.length - 1} aria-label={`Move ${clause.title} down`} className="flex h-10 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-25 dark:hover:bg-white/10"><ArrowDown size={15} /></button>
                    </div>
                  )}
                  <button type="button" onClick={() => setExpanded(open ? null : clause.id)} aria-label={open ? 'Collapse' : 'Expand'} className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/10">
                    <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
                  </button>
                </div>

                {open && (
                  <div className="space-y-3 border-t border-black/[0.06] p-3 dark:border-white/[0.06]">
                    {canEdit ? (
                      <>
                        <label className="block">
                          <span className="mb-1 block text-[12px] font-bold text-gray-500">Clause title</span>
                          <input className={fieldCls} value={clause.title || ''} onChange={e => onUpdateClause(clause.id, { title: e.target.value })} />
                        </label>
                        {clause.levels && (
                          <div>
                            <span className="mb-1 block text-[12px] font-bold text-gray-500">Strictness</span>
                            <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/[0.04] p-1 dark:bg-white/[0.05]" role="radiogroup" aria-label="Strictness">
                              {STRICTNESS.map(level => (
                                <button key={level.value} type="button" role="radio" aria-checked={clause.strictness === level.value}
                                  onClick={() => {
                                    const edited = clause.levels[clause.strictness] && plain(clause.content) !== plain(clause.levels[clause.strictness]);
                                    if (edited && !window.confirm('Switching strictness replaces your edits to this clause with the library wording. Continue?')) return;
                                    onUpdateClause(clause.id, { strictness: level.value, content: clause.levels[level.value] });
                                  }}
                                  className={cn('h-10 rounded-lg text-[13px] font-semibold transition-colors',
                                    clause.strictness === level.value ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white')}>
                                  {level.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[12px] font-bold text-gray-500">Wording</span>
                            {onRefineClick && (
                              <button type="button" onClick={() => onRefineClick(`clauses[${clause.id}]`, clause.title, clause.content)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-violet-600 hover:bg-violet-500/10 dark:text-violet-300">
                                <Sparkles size={13} /> Improve with AI
                              </button>
                            )}
                          </div>
                          <RichEditor label={`${clause.title || 'Clause'} wording`} value={clause.content || ''} onChange={val => onUpdateClause(clause.id, { content: val })} minHeight={120} />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <button type="button" role="switch" aria-checked={included} onClick={() => onUpdateClause(clause.id, { isActive: !included })}
                            className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-[13px] font-semibold">
                            <span className={cn('relative h-6 w-10 rounded-full transition-colors', included ? 'bg-emerald-500 dark:bg-neon-green' : 'bg-black/15 dark:bg-white/15')}>
                              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', included ? 'left-[18px]' : 'left-0.5')} />
                            </span>
                            {included ? 'In the contract' : 'Left out of the contract'}
                          </button>
                          {onRemoveClause && (
                            <Button variant="ghost" size="sm" onClick={() => remove(clause)} className="text-red-500 hover:text-red-600"><Trash2 size={14} /> Remove</Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-[13px] leading-relaxed text-gray-600 dark:text-zinc-300 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: clause.content || '' }} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!disabled && onToggleClause && (
        <button type="button" onClick={() => setPickerOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 text-[13px] font-bold text-gray-600 transition-colors hover:border-amber-500/50 hover:text-gray-900 dark:border-white/10 dark:text-zinc-300 dark:hover:text-white">
          <BookOpen size={16} /> Add clauses
        </button>
      )}

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} size="lg" title="Add clauses" subtitle="Pick from the library or write your own. Added clauses go to the end; reorder them after.">
        <div className="space-y-5">
          <SearchInput value={query} onChange={setQuery} placeholder="Search clauses" />
          <ul className="space-y-2">
            {library.map(lc => {
              const added = activeIds.has(lc.id);
              const essential = ESSENTIAL_CLAUSES.some(e => e.id === lc.id);
              return (
                <li key={lc.id} className={cn('flex items-start gap-3 rounded-2xl border p-3', added ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-black/[0.08] dark:border-white/[0.08]')}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold">
                      {lc.title}
                      <Badge tone={CATEGORY_TONE[lc.category] || 'gray'}>{CATEGORY_LABEL[lc.category] || lc.category}</Badge>
                      {essential && <Badge tone="amber">Essential</Badge>}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-gray-500">{plain(lc.levels?.medium)}</p>
                  </div>
                  <Button size="sm" variant={added ? 'ghost' : 'accent'} disabled={added} onClick={() => onToggleClause(lc.id, 'add')} className="mt-0.5">
                    {added ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add</>}
                  </Button>
                </li>
              );
            })}
            {library.length === 0 && <li className="py-6 text-center text-[13px] text-gray-500">No library clause matches “{query}”.</li>}
          </ul>

          {onAddCustom && (
            <div className="space-y-3 rounded-2xl border border-black/[0.08] p-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-[15px] font-bold">Write your own</h3>
                <p className="text-[12px] text-gray-500">For terms the library doesn't cover, like a rider or a cancellation fee.</p>
              </div>
              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-gray-500">Clause title</span>
                <input className={fieldCls} value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="e.g. Artist rider" />
              </label>
              <div>
                <span className="mb-1 block text-[12px] font-bold text-gray-500">Wording</span>
                <RichEditor label="Custom clause wording" value={customContent} onChange={setCustomContent} placeholder="Write the clause…" minHeight={120} />
              </div>
              <Button variant="accent" onClick={addCustom} disabled={!customTitle.trim()}><Plus size={14} /> Add clause</Button>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
};

export default ClauseMarketplace;
