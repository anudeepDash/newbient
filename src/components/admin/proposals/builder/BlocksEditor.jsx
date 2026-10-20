import React from 'react';
import { Toggle, Field, fieldCls } from '../../uploads/UploadKit';
import ThemedSelect from '../../ThemedSelect';
import { TextInput, TextArea, ListCard, RowActions, AddButton, moveItem } from './parts';
import { newId } from './model';

/*
 * Editor for the content blocks of a proposal page (components/ui/proposalDesign
 * renders them): text, callouts, card grids, tables, numbered steps, bullets,
 * an image and a small note. `blocks` is the list; `onChange(next)` replaces it.
 */

const BLOCKS = [
    { type: 'text', label: 'Text', make: () => ({ text: '' }) },
    { type: 'callout', label: 'Callout box', make: () => ({ label: '', text: '', accent: false }) },
    { type: 'cards', label: 'Cards', make: () => ({ label: '', columns: '', items: [{ kicker: '', title: '', text: '', meta: '' }, { kicker: '', title: '', text: '', meta: '' }, { kicker: '', title: '', text: '', meta: '' }] }) },
    { type: 'table', label: 'Table', make: () => ({ label: '', columns: ['', ''], rows: [['', ''], ['', '']], numbered: false, note: '' }) },
    { type: 'steps', label: 'Numbered steps', make: () => ({ label: '', items: [{ title: '', bullets: [''] }] }) },
    { type: 'bullets', label: 'Bullet list', make: () => ({ label: '', items: [''] }) },
    { type: 'image', label: 'Image', make: () => ({ label: '', url: '', caption: '', sideLabel: '', sideText: '' }) },
    { type: 'note', label: 'Small note', make: () => ({ text: '' }) },
];
const labelOf = (type) => BLOCKS.find(b => b.type === type)?.label || 'Block';

const TEXT_HINT = 'Use **double stars** for bold. Leave a blank line between paragraphs.';
const lines = (list) => (Array.isArray(list) ? list.join('\n') : '');
const toLines = (v) => String(v ?? '').split('\n');

/** A small list inside a block (cards, table rows, steps): move, remove, add. */
const SubList = ({ items, onChange, render, addLabel, make, itemLabel }) => (
    <div className="space-y-2">
        {items.map((it, i) => (
            <div key={i} className="rounded-xl border border-black/[0.07] p-3 dark:border-white/[0.07]">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12px] font-bold text-gray-500">{itemLabel} {i + 1}</span>
                    <RowActions
                        index={i}
                        count={items.length}
                        onMove={(idx, d) => onChange(moveItem(items, idx, d))}
                        onRemove={(idx) => onChange(items.filter((_, j) => j !== idx))}
                        removeLabel={`Remove ${itemLabel.toLowerCase()}`}
                    />
                </div>
                <div className="space-y-2">{render(it, (patch) => onChange(items.map((x, j) => (j === i ? patch(x) : x))))}</div>
            </div>
        ))}
        <AddButton onClick={() => onChange([...items, make()])}>{addLabel}</AddButton>
    </div>
);

const LabelField = ({ block, set, placeholder = 'e.g. CAMPAIGN PHASES' }) => (
    <TextInput label="Small label above it" optional value={block.label} onChange={v => set({ label: v })} placeholder={placeholder} />
);

const TableFields = ({ block, set }) => {
    const cols = Array.isArray(block.columns) ? block.columns : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];
    const setCols = (next) => set({ columns: next, rows: rows.map(r => next.map((_, i) => r[i] ?? '')) });
    return (
        <>
            <LabelField block={block} set={set} placeholder="e.g. RUN OF THE DAY" />
            <Field label="Columns">
                <div className="space-y-2">
                    {cols.map((c, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <input className={fieldCls} value={c} onChange={e => setCols(cols.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Column ${i + 1} heading`} aria-label={`Column ${i + 1} heading`} />
                            <RowActions index={i} count={cols.length} onRemove={cols.length > 1 ? (idx) => set({ columns: cols.filter((_, j) => j !== idx), rows: rows.map(r => r.filter((_, j) => j !== idx)) }) : undefined} removeLabel="Remove column" />
                        </div>
                    ))}
                    {cols.length < 5 && <AddButton onClick={() => setCols([...cols, ''])}>Add a column</AddButton>}
                </div>
            </Field>
            <SubList
                items={rows}
                itemLabel="Row"
                addLabel="Add a row"
                make={() => cols.map(() => '')}
                onChange={(next) => set({ rows: next })}
                render={(row, patch) => cols.map((c, ci) => (
                    <TextArea key={ci} rows={1} label={c || `Column ${ci + 1}`} value={row[ci]} onChange={v => patch(r => cols.map((_, j) => (j === ci ? v : (r[j] ?? ''))))} />
                ))}
            />
            <p className="text-[11.5px] leading-snug text-gray-500">A second line in a cell shows as a small grey line. Put a word in double square brackets, like [[TBC]], to show it as a tag.</p>
            <Toggle label="Number the rows" checked={Boolean(block.numbered)} onChange={v => set({ numbered: v })} />
            <TextInput label="Note under the table" optional value={block.note} onChange={v => set({ note: v })} placeholder="e.g. All figures are indicative" />
        </>
    );
};

const BlockFields = ({ block, set }) => {
    switch (block.type) {
        case 'text':
            return <TextArea label="Text" rows={5} value={block.text} onChange={v => set({ text: v })} hint={TEXT_HINT} />;
        case 'callout':
            return (
                <>
                    <TextInput label="Box title" value={block.label} onChange={v => set({ label: v })} placeholder="e.g. WHY THIS APPROACH" />
                    <TextArea label="Box text" rows={4} value={block.text} onChange={v => set({ text: v })} hint={TEXT_HINT} />
                    <Toggle label="Green bar on the left" hint="For the one box that matters most on the page." checked={Boolean(block.accent)} onChange={v => set({ accent: v })} />
                </>
            );
        case 'cards':
            return (
                <>
                    <LabelField block={block} set={set} />
                    <Field label="Cards per row">
                        <ThemedSelect className={fieldCls} value={String(block.columns || '')} onChange={e => set({ columns: e.target.value })}>
                            <option value="">Automatic</option>
                            {[2, 3, 4, 5].map(n => <option key={n} value={String(n)}>{n}</option>)}
                        </ThemedSelect>
                    </Field>
                    <SubList
                        items={block.items || []}
                        itemLabel="Card"
                        addLabel="Add a card"
                        make={() => ({ kicker: '', title: '', text: '', meta: '' })}
                        onChange={(next) => set({ items: next })}
                        render={(card, patch) => (
                            <>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <TextInput label="Green label" optional value={card.kicker} onChange={v => patch(c => ({ ...c, kicker: v }))} placeholder="e.g. PHASE 1" />
                                    <TextInput label="Title" value={card.title} onChange={v => patch(c => ({ ...c, title: v }))} />
                                </div>
                                <TextArea label="Text" optional rows={2} value={card.text} onChange={v => patch(c => ({ ...c, text: v }))} />
                                <TextInput label="Grey line" optional value={card.meta} onChange={v => patch(c => ({ ...c, meta: v }))} placeholder="e.g. 25 Oct - 7 Nov" />
                            </>
                        )}
                    />
                </>
            );
        case 'table':
            return <TableFields block={block} set={set} />;
        case 'steps':
            return (
                <>
                    <LabelField block={block} set={set} />
                    <SubList
                        items={block.items || []}
                        itemLabel="Step"
                        addLabel="Add a step"
                        make={() => ({ title: '', bullets: [''] })}
                        onChange={(next) => set({ items: next })}
                        render={(step, patch) => (
                            <>
                                <TextInput label="Step title" value={step.title} onChange={v => patch(s => ({ ...s, title: v }))} />
                                <TextArea label="Points" rows={3} value={lines(step.bullets)} onChange={v => patch(s => ({ ...s, bullets: toLines(v) }))} hint="One point per line." />
                            </>
                        )}
                    />
                </>
            );
        case 'bullets':
            return (
                <>
                    <LabelField block={block} set={set} />
                    <TextArea label="Points" rows={4} value={lines(block.items)} onChange={v => set({ items: toLines(v) })} hint="One point per line. **Bold** works here too." />
                </>
            );
        case 'image':
            return (
                <>
                    <LabelField block={block} set={set} placeholder="e.g. BOOTH LAYOUT" />
                    <TextInput label="Image link" value={block.url} onChange={v => set({ url: v.trim() })} placeholder="https://…" hint="A JPG or PNG link (Cloudinary or similar) that allows downloads." />
                    <TextInput label="Caption" optional value={block.caption} onChange={v => set({ caption: v })} />
                    <TextInput label="Text beside it: label" optional value={block.sideLabel} onChange={v => set({ sideLabel: v })} placeholder="e.g. ON THE FLOOR" />
                    <TextArea label="Text beside it" optional rows={4} value={block.sideText} onChange={v => set({ sideText: v })} hint={TEXT_HINT} />
                </>
            );
        case 'note':
            return <TextInput label="Note" value={block.text} onChange={v => set({ text: v })} placeholder="e.g. Discount values are set with the client" hint="Printed small, in grey capitals." />;
        default:
            return null;
    }
};

const BlocksEditor = ({ blocks = [], onChange, emptyHint }) => {
    const list = Array.isArray(blocks) ? blocks : [];
    const update = (idx, patch) => onChange(list.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
    const add = (type) => {
        const def = BLOCKS.find(b => b.type === type);
        onChange([...list, { id: newId(), type, ...def.make() }]);
    };
    return (
        <div className="space-y-3">
            {list.length === 0 && emptyHint && <p className="text-[12.5px] text-gray-500">{emptyHint}</p>}
            {list.map((block, idx) => (
                <ListCard
                    key={block.id || idx}
                    badge={idx + 1}
                    title={labelOf(block.type)}
                    actions={(
                        <RowActions
                            index={idx}
                            count={list.length}
                            onMove={(i, d) => onChange(moveItem(list, i, d))}
                            onDuplicate={(i) => onChange([...list.slice(0, i + 1), { ...JSON.parse(JSON.stringify(list[i])), id: newId() }, ...list.slice(i + 1)])}
                            onRemove={(i) => { if (window.confirm(`Remove this ${labelOf(list[i].type).toLowerCase()}?`)) onChange(list.filter((_, j) => j !== i)); }}
                            removeLabel="Remove block"
                        />
                    )}
                >
                    <BlockFields block={block} set={(patch) => update(idx, patch)} />
                </ListCard>
            ))}
            <div>
                <p className="mb-2 text-[12px] font-bold text-gray-500">Add to this page</p>
                <div className="flex flex-wrap gap-1.5">
                    {BLOCKS.map(b => (
                        <button
                            key={b.type}
                            type="button"
                            onClick={() => add(b.type)}
                            className="h-10 rounded-full border border-black/10 px-3.5 text-[12.5px] font-semibold text-gray-700 transition-colors hover:border-black/25 dark:border-white/10 dark:text-zinc-200 dark:hover:border-white/25"
                        >
                            + {b.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlocksEditor;
