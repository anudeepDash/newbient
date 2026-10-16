import React, { useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { cn } from '../../../../lib/utils';
import { BuilderCard } from '../../events/EditorParts';
import { Toggle, fieldCls, areaCls } from '../../uploads/UploadKit';
import { TextInput, RichField, MoneyInput, ListCard, RowActions, AddButton, Chips, FieldHead, moveItem } from './parts';
import { DEFAULT_COLUMNS, COLUMN_TYPES, rupees, newId } from './model';
import ThemedSelect from '../../ThemedSelect';

/*
 * Editors for classic-format proposals (older proposals keep their format so
 * their document looks the same). Field names are the ones those proposals
 * already store.
 */

const useLegacy = (formData, setFormData) => {
    const hidden = formData.hiddenFields || [];
    return {
        set: (patch) => setFormData(prev => ({ ...prev, ...patch })),
        setList: (key, fn) => setFormData(prev => ({ ...prev, [key]: fn(Array.isArray(prev[key]) ? prev[key] : []) })),
        shown: (field) => !hidden.includes(field),
        setShown: (field, show) => setFormData(prev => {
            const list = prev.hiddenFields || [];
            const next = show ? list.filter(f => f !== field) : (list.includes(field) ? list : [...list, field]);
            return { ...prev, hiddenFields: next };
        }),
    };
};

const ShowRow = ({ label = 'Show this page', checked, onChange }) => (
    <div className="mb-4 rounded-xl bg-black/[0.025] px-3 py-2 dark:bg-white/[0.03]">
        <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
);

const Titles = ({ formData, set, titleKey, subKey }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Page title" value={formData[titleKey]} onChange={v => set({ [titleKey]: v })} />
        <TextInput label="Subtitle" value={formData[subKey]} onChange={v => set({ [subKey]: v })} />
    </div>
);

export const LegacyCoverEditor = ({ formData, setFormData, onRefine }) => {
    const { set, shown, setShown } = useLegacy(formData, setFormData);
    return (
        <BuilderCard title="Campaign and cover">
            <ShowRow label="Show the cover page" checked={shown('cover')} onChange={v => setShown('cover', v)} />
            <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextInput label="Project name" value={formData.campaignName} onChange={v => set({ campaignName: v })} placeholder="Project or event title" />
                    <TextInput label="Timeline or duration" value={formData.campaignDuration} onChange={v => set({ campaignDuration: v })} placeholder="e.g. 15–20 Oct or 3 months" />
                </div>
                <Toggle label="Show the cover note" checked={shown('coverDescription')} onChange={v => setShown('coverDescription', v)} />
                {shown('coverDescription') && (
                    <RichField label="Cover note" value={formData.coverDescription} onChange={v => set({ coverDescription: v })} placeholder="A short description of the proposal" onRefine={() => onRefine?.({ label: 'Cover note', value: formData.coverDescription, apply: (t) => set({ coverDescription: t }) })} />
                )}
            </div>
        </BuilderCard>
    );
};

export const LegacyStrategyEditor = ({ formData, setFormData, onRefine }) => {
    const { set, shown, setShown } = useLegacy(formData, setFormData);
    return (
        <BuilderCard title="Strategy" hint="Executive summary and objective">
            <ShowRow checked={shown('strategy')} onChange={v => setShown('strategy', v)} />
            <div className="space-y-4">
                <Titles formData={formData} set={set} titleKey="strategyTitle" subKey="strategySub" />
                <Toggle label="Show the executive summary" checked={shown('overview')} onChange={v => setShown('overview', v)} />
                {shown('overview') && <RichField label="Executive summary" minHeight={200} value={formData.overview} onChange={v => set({ overview: v })} onRefine={() => onRefine?.({ label: 'Executive summary', value: formData.overview, apply: (t) => set({ overview: t }) })} />}
                <Toggle label="Show the objective" checked={shown('primaryGoal')} onChange={v => setShown('primaryGoal', v)} />
                {shown('primaryGoal') && <RichField label="Primary objective" minHeight={120} value={formData.primaryGoal} onChange={v => set({ primaryGoal: v })} onRefine={() => onRefine?.({ label: 'Primary objective', value: formData.primaryGoal, apply: (t) => set({ primaryGoal: t }) })} />}
            </div>
        </BuilderCard>
    );
};

export const LegacyScopeEditor = ({ formData, setFormData, onRefine }) => {
    const { set, shown, setShown } = useLegacy(formData, setFormData);
    return (
        <BuilderCard title="Scope of work">
            <ShowRow checked={shown('scopeOfWork')} onChange={v => setShown('scopeOfWork', v)} />
            <div className="space-y-4">
                <Titles formData={formData} set={set} titleKey="scopeTitle" subKey="scopeSub" />
                <RichField label="Scope of work" minHeight={320} value={formData.scopeOfWork} onChange={v => set({ scopeOfWork: v })} placeholder="Use a bullet for each scope item. Long text flows onto more pages." onRefine={() => onRefine?.({ label: 'Scope of work', value: formData.scopeOfWork, apply: (t) => set({ scopeOfWork: t }) })} />
            </div>
        </BuilderCard>
    );
};

export const LegacyDeliverablesEditor = ({ formData, setFormData }) => {
    const { set, setList, shown, setShown } = useLegacy(formData, setFormData);
    const deliverables = formData.deliverables || [];
    const reqs = formData.clientRequirements || [];
    return (
        <div className="space-y-5">
            <BuilderCard title="Deliverables" hint="What we deliver, how many and when">
                <ShowRow checked={shown('proposal')} onChange={v => setShown('proposal', v)} />
                <div className="space-y-3">
                    <Titles formData={formData} set={set} titleKey="proposalTitle" subKey="proposalSub" />
                    {deliverables.map((d, idx) => (
                        <ListCard key={d.id || idx} badge={idx + 1} actions={<RowActions index={idx} count={deliverables.length} onMove={(i, dl) => setList('deliverables', l => moveItem(l, i, dl))} onRemove={(i) => setList('deliverables', l => l.filter((_, j) => j !== i))} removeLabel="Remove deliverable" />}>
                            <TextInput label="Deliverable" value={d.item} onChange={v => setList('deliverables', l => l.map((x, i) => (i === idx ? { ...x, item: v } : x)))} />
                            <div className="grid grid-cols-2 gap-3">
                                <TextInput label="Qty / unit" value={d.qty} onChange={v => setList('deliverables', l => l.map((x, i) => (i === idx ? { ...x, qty: v } : x)))} />
                                <TextInput label="Timeline" value={d.timeline} onChange={v => setList('deliverables', l => l.map((x, i) => (i === idx ? { ...x, timeline: v } : x)))} placeholder="e.g. Week 1–2" />
                            </div>
                        </ListCard>
                    ))}
                    <AddButton onClick={() => setList('deliverables', l => [...l, { id: newId(), item: '', qty: '', timeline: '' }])}>Add a deliverable</AddButton>
                </div>
            </BuilderCard>
            <BuilderCard title="What we need from the client">
                <Toggle label="Show this list" checked={shown('clientRequirements')} onChange={v => setShown('clientRequirements', v)} />
                <div className="mt-3 space-y-2">
                    {reqs.map((r, idx) => (
                        <div key={r.id || idx} className="flex items-center gap-1">
                            <input aria-label={`Requirement ${idx + 1}`} className={cn(fieldCls, 'min-w-0 flex-1')} value={r.description || ''} onChange={e => setList('clientRequirements', l => l.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} placeholder="e.g. Brand guidelines and logos" />
                            <RowActions index={idx} count={reqs.length} onRemove={(i) => setList('clientRequirements', l => l.filter((_, j) => j !== i))} />
                        </div>
                    ))}
                    <AddButton onClick={() => setList('clientRequirements', l => [...l, { id: newId(), description: '' }])}>Add a requirement</AddButton>
                </div>
            </BuilderCard>
        </div>
    );
};

/** The price table: its columns and its rows. "Amount" columns hold line totals. */
export const LegacyPricingEditor = ({ formData, setFormData, items, setItems }) => {
    const { set, shown, setShown } = useLegacy(formData, setFormData);
    const [newCol, setNewCol] = useState('');
    const cols = formData.tableColumns || DEFAULT_COLUMNS;
    const setCols = (fn) => setFormData(prev => ({ ...prev, tableColumns: fn(prev.tableColumns || DEFAULT_COLUMNS) }));
    const updateItem = (idx, patch) => setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    const numberValue = (v) => (v === '' ? '' : Number(v));

    const addColumn = () => {
        const label = newCol.trim();
        if (!label) return;
        const key = `custom_${Date.now()}`;
        setCols(c => [...c, { key, label, type: 'text' }]);
        setNewCol('');
    };
    const removeColumn = (key) => {
        if (!window.confirm('Remove this column and its values from every row?')) return;
        setCols(c => c.filter(x => x.key !== key));
        setItems(prev => prev.map(it => { const copy = { ...it }; delete copy[key]; return copy; }));
        if (formData.totalSourceColumn === key) set({ totalSourceColumn: 'price' });
    };
    const addRow = () => {
        const row = { id: newId(), description: '', qty: 1, price: 0 };
        cols.forEach(c => { if (!['description', 'qty', 'price'].includes(c.key)) row[c.key] = ''; });
        setItems(prev => [...prev, row]);
    };

    return (
        <div className="space-y-5">
            <BuilderCard title="Price table">
                <ShowRow checked={shown('inventory')} onChange={v => setShown('inventory', v)} />
                <div className="space-y-3">
                    <Titles formData={formData} set={set} titleKey="inventoryTitle" subKey="inventorySub" />
                    {items.map((item, idx) => (
                        <ListCard key={item.id || idx} badge={idx + 1} actions={<RowActions index={idx} count={items.length} onMove={(i, d) => setItems(prev => moveItem(prev, i, d))} onRemove={(i) => setItems(prev => prev.filter((_, j) => j !== i))} removeLabel="Remove row" />}>
                            {cols.map(col => {
                                const type = col.type || (col.key === 'price' ? 'amount' : col.key === 'qty' ? 'number' : 'text');
                                if (col.key === 'description') {
                                    return (
                                        <div key={col.key}>
                                            <FieldHead label={col.label || 'Description'} />
                                            <textarea aria-label={col.label || 'Description'} rows={2} className={cn(areaCls, 'resize-y')} value={item.description || ''} onChange={e => updateItem(idx, { description: e.target.value })} />
                                        </div>
                                    );
                                }
                                if (type === 'amount') return <MoneyInput key={col.key} label={col.label} value={item[col.key] ?? ''} onChange={v => updateItem(idx, { [col.key]: v })} />;
                                if (type === 'number') return <MoneyInput key={col.key} label={col.label} prefix="" value={item[col.key] ?? ''} onChange={v => updateItem(idx, { [col.key]: numberValue(v) })} />;
                                return <TextInput key={col.key} label={col.label} value={item[col.key]} onChange={v => updateItem(idx, { [col.key]: v })} />;
                            })}
                        </ListCard>
                    ))}
                    <AddButton onClick={addRow}>Add a row</AddButton>
                </div>
            </BuilderCard>

            <BuilderCard title="Table columns" hint="Rename, change type, reorder or add columns">
                <div className="space-y-2">
                    {cols.map((col, idx) => {
                        const fixed = ['description', 'qty', 'price'].includes(col.key);
                        return (
                            <div key={col.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/[0.08] p-2 dark:border-white/[0.08] sm:flex-nowrap">
                                <input aria-label="Column name" className={cn(fieldCls, 'h-11 min-w-0 flex-1 basis-40')} value={col.label} onChange={e => setCols(c => c.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} />
                                <ThemedSelect aria-label="Column type" disabled={fixed} className={cn(fieldCls, 'h-11 w-36 shrink-0 text-[13px]')} value={col.type || (col.key === 'price' ? 'amount' : col.key === 'qty' ? 'number' : 'text')} onChange={e => setCols(c => c.map((x, i) => (i === idx ? { ...x, type: e.target.value } : x)))}>
                                    {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </ThemedSelect>
                                <RowActions index={idx} count={cols.length} onMove={(i, d) => setCols(c => moveItem(c, i, d))} onRemove={fixed ? undefined : () => removeColumn(col.key)} removeLabel="Remove column" />
                            </div>
                        );
                    })}
                    <div className="flex gap-2">
                        <input aria-label="New column name" className={cn(fieldCls, 'min-w-0 flex-1')} value={newCol} onChange={e => setNewCol(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }} placeholder="New column, e.g. City" enterKeyHint="done" />
                        <button type="button" onClick={addColumn} disabled={!newCol.trim()} className="flex h-12 shrink-0 items-center gap-1 rounded-xl border border-black/10 px-4 text-[13px] font-bold disabled:opacity-40 dark:border-white/10"><Plus size={14} /> Add</button>
                    </div>
                </div>
            </BuilderCard>
        </div>
    );
};

export const LegacyPaymentEditor = ({ formData, setFormData, totals, onRefine }) => {
    const { set, shown, setShown } = useLegacy(formData, setFormData);
    const cols = formData.tableColumns || DEFAULT_COLUMNS;
    const amountCols = cols.filter(c => c.key !== 'description' && (c.type === 'amount' || c.type === 'number' || c.key === 'price'));
    return (
        <div className="space-y-5">
            <BuilderCard title="Totals and GST">
                <div className="space-y-3">
                    {amountCols.length > 1 && (
                        <div>
                            <span className="mb-1 block text-[12px] font-bold text-gray-500">Add up this column</span>
                            <Chips options={amountCols.map(c => ({ label: c.label, value: c.key }))} value={formData.totalSourceColumn || 'price'} onPick={v => set({ totalSourceColumn: v })} />
                        </div>
                    )}
                    <Toggle label="Add GST" checked={Boolean(formData.showGst)} onChange={v => set({ showGst: v })} />
                    {formData.showGst && (
                        <div className="space-y-2">
                            <MoneyInput label="GST rate (%)" prefix="" value={formData.gstRate ?? 18} onChange={v => set({ gstRate: v === '' ? '' : Math.max(0, Math.min(100, v)) })} />
                            <Chips options={[5, 12, 18, 28].map(r => ({ label: `${r}%`, value: r }))} value={Number(formData.gstRate)} onPick={v => set({ gstRate: v })} />
                        </div>
                    )}
                    <div>
                        <MoneyInput label="Advance on signing (%)" prefix="" value={formData.advanceRequested ?? 0} onChange={v => set({ advanceRequested: v === '' ? '' : Math.max(0, Math.min(100, v)) })} />
                        <div className="mt-2"><Chips options={[0, 30, 50, 100].map(p => ({ label: `${p}%`, value: p }))} value={Number(formData.advanceRequested)} onPick={v => set({ advanceRequested: v })} /></div>
                    </div>
                    <div className="rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.08]">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-bold">Set the subtotal by hand</span>
                            {totals.hasOverride ? (
                                <button type="button" onClick={() => set({ totalOverride: null })} className="flex h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-bold text-red-500 hover:bg-red-500/10"><RotateCcw size={13} /> Use table total</button>
                            ) : (
                                <button type="button" onClick={() => set({ totalOverride: totals.subtotal })} className="h-9 rounded-lg border border-black/10 px-3 text-[12px] font-bold dark:border-white/10">Override</button>
                            )}
                        </div>
                        {totals.hasOverride && <div className="mt-2"><MoneyInput aria-label="Subtotal" value={formData.totalOverride} onChange={v => set({ totalOverride: v === '' ? '' : v })} hint="GST is worked out on this amount." /></div>}
                    </div>
                    <div className="rounded-xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.03]">
                        <div className="flex justify-between py-0.5"><span className="text-gray-500">Subtotal{totals.hasOverride ? ' (set by hand)' : ''}</span><span className="font-semibold tabular-nums">{rupees(totals.hasOverride ? formData.totalOverride : totals.subtotal)}</span></div>
                        {formData.showGst && <div className="flex justify-between py-0.5"><span className="text-gray-500">GST {totals.gstRate}%</span><span className="font-semibold tabular-nums">{rupees(totals.gstAmount)}</span></div>}
                        <div className="mt-1 flex justify-between border-t border-black/[0.06] pt-1.5 text-[15px] dark:border-white/[0.08]"><span className="font-bold">Total</span><span className="font-extrabold tabular-nums">{rupees(totals.totalAmount)}</span></div>
                        {Number(formData.advanceRequested) > 0 && <div className="flex justify-between py-0.5"><span className="text-gray-500">Advance {formData.advanceRequested}%</span><span className="font-semibold tabular-nums">{rupees(totals.totalAmount * Number(formData.advanceRequested) / 100)}</span></div>}
                    </div>
                    <Toggle label="Hide the totals box on the document" checked={Boolean(formData.hideTotalColumn)} onChange={v => set({ hideTotalColumn: v })} />
                </div>
            </BuilderCard>

            <BuilderCard title="Terms and payment details">
                <ShowRow label="Show the commercial terms page" checked={shown('commercials')} onChange={v => setShown('commercials', v)} />
                <div className="space-y-4">
                    <Titles formData={formData} set={set} titleKey="commercialsTitle" subKey="commercialsSub" />
                    <RichField label="Terms and conditions" minHeight={220} value={formData.terms} onChange={v => set({ terms: v })} placeholder="Payment milestones, validity, cancellation…" onRefine={() => onRefine?.({ label: 'Terms', value: formData.terms, apply: (t) => set({ terms: t }) })} />
                    <Toggle label="Show bank and UPI details" checked={formData.showPaymentDetails !== false} onChange={v => set({ showPaymentDetails: v })} />
                    {formData.showPaymentDetails !== false && (
                        <textarea aria-label="Bank and UPI details" rows={5} className={cn(areaCls, 'font-mono text-[13px]')} value={formData.paymentDetails || ''} onChange={e => set({ paymentDetails: e.target.value })} placeholder="Account name, number, IFSC, UPI" />
                    )}
                </div>
            </BuilderCard>
        </div>
    );
};
