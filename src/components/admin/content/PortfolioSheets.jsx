import React, { useEffect, useMemo, useRef, useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import Sheet from '../Sheet';
import { Button, Badge } from '../ui';
import { fieldCls, Field } from '../uploads/UploadKit';
import { BuilderCard } from '../events/EditorParts';
import LivePreview from '../LivePreview';
import { ConfirmSheet, ImagePicker, FramingControls, LabelRow } from './ContentKit';
import { toDateInput } from './contentRules';
import ThemedSelect from '../ThemedSelect';

const blank = (categories) => ({
    title: '', date: '', year: new Date().getFullYear(), category: categories[0]?.id || '', sector: '',
    image: '', imageTransform: { scale: 1, x: 0, y: 0 }, highlightUrl: '',
});

/** Add or edit one portfolio project. `item` = the project, or null for a new one. */
export const PortfolioEditorSheet = ({ open, onClose, item, categories, onManageCategories }) => {
    const { addPortfolioItem, updatePortfolioItem, addToast } = useStore();
    const [form, setForm] = useState(() => blank(categories));
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const lock = useRef(false);

    const key = item?.id || 'new';
    useEffect(() => {
        if (!open) return;
        setTouched(false);
        setForm(item ? {
            title: item.title || '',
            date: toDateInput(item.date),
            year: item.year || '',
            category: item.category || '',
            sector: item.sector || '',
            image: item.image || '',
            imageTransform: item.imageTransform || { scale: 1, x: 0, y: 0 },
            highlightUrl: item.highlightUrl || '',
        } : blank(categories));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, key]);

    const set = (patch) => setForm(f => ({ ...f, ...patch }));
    const categoryKnown = categories.some(c => c.id === form.category);
    const problems = useMemo(() => {
        const out = {};
        if (!form.title.trim()) out.title = 'Add the project name.';
        if (form.highlightUrl && !/^https?:\/\//i.test(form.highlightUrl.trim())) out.highlightUrl = 'Paste the full link, starting with https://';
        if (form.year && (Number(form.year) < 1990 || Number(form.year) > 2100)) out.year = 'That year looks off.';
        return out;
    }, [form]);

    const save = async () => {
        setTouched(true);
        if (Object.keys(problems).length || lock.current) return;
        lock.current = true;
        setSaving(true);
        const payload = {
            title: form.title.trim(),
            date: form.date || '',
            year: form.year ? Number(form.year) : (form.date ? Number(form.date.slice(0, 4)) : ''),
            category: form.category || categories[0]?.id || '',
            sector: form.sector.trim(),
            image: form.image || '',
            imageTransform: form.imageTransform || { scale: 1, x: 0, y: 0 },
            highlightUrl: form.highlightUrl.trim(),
        };
        try {
            if (item) await updatePortfolioItem(item.id, payload);
            else await addPortfolioItem({ ...payload, createdAt: new Date().toISOString() });
            addToast(item ? 'Project saved.' : 'Project added to the portfolio.', 'success');
            onClose();
        } catch (err) {
            console.error('Portfolio save failed:', err);
            addToast('Check your connection and try again.', 'error', { title: "Couldn't save the project", action: { label: 'Try again', onClick: () => save() } });
        } finally {
            lock.current = false;
            setSaving(false);
        }
    };

    const err = (k) => touched && problems[k] ? <span role="alert" className="mt-1 block text-[12px] font-semibold text-red-600 dark:text-red-400">{problems[k]}</span> : null;

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            size="xl"
            title={item ? 'Edit project' : 'New project'}
            subtitle={item ? item.title : 'A past event or campaign for the home page portfolio'}
            footer={(
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={saving} className="h-12 flex-1 sm:flex-none">Cancel</Button>
                    <Button variant="accent" onClick={save} disabled={saving} className="h-12 flex-[2] sm:ml-auto sm:flex-none sm:px-6">{saving ? 'Saving…' : item ? 'Save changes' : 'Add project'}</Button>
                </div>
            )}
        >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-5">
                    <BuilderCard title="Details">
                        <div className="space-y-4">
                            <label className="block">
                                <LabelRow label="Project name" />
                                <input className={fieldCls} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Sunburn Arena · Bengaluru" />
                                {err('title')}
                            </label>
                            <div>
                                <LabelRow label="Category" right={<button type="button" onClick={onManageCategories} className="h-7 font-semibold text-violet-600 dark:text-violet-300">Manage</button>} />
                                <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={form.category} onChange={(e) => set({ category: e.target.value })}>
                                    {!categories.length && <option value="">No categories yet</option>}
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    {form.category && !categoryKnown && <option value={form.category}>{form.category} (deleted)</option>}
                                </ThemedSelect>
                                {!categoryKnown && <span className="mt-1 block text-[12px] font-semibold text-amber-600 dark:text-amber-400">Projects without a current category don't show on the website.</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Date" optional>
                                    <input type="date" className={fieldCls} value={form.date} onChange={(e) => set({ date: e.target.value, year: e.target.value ? Number(e.target.value.slice(0, 4)) : form.year })} />
                                </Field>
                                <label className="block">
                                    <LabelRow label="Year" />
                                    <input type="number" inputMode="numeric" className={fieldCls} value={form.year} onChange={(e) => set({ year: e.target.value })} placeholder={String(new Date().getFullYear())} />
                                    {err('year')}
                                </label>
                            </div>
                            <Field label="Label on the card" optional hint="Leave empty to show the category name">
                                <input className={fieldCls} value={form.sector} onChange={(e) => set({ sector: e.target.value })} placeholder="Music festival" />
                            </Field>
                            <label className="block">
                                <LabelRow label="Highlight reel" optional />
                                <input className={fieldCls} value={form.highlightUrl} onChange={(e) => set({ highlightUrl: e.target.value })} placeholder="https://www.instagram.com/reel/…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                                {err('highlightUrl')}
                            </label>
                        </div>
                    </BuilderCard>
                    <BuilderCard title="Picture" hint="Portrait works best (4:5)">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <ImagePicker value={form.image} onChange={(url) => set({ image: url, imageTransform: { scale: 1, x: 0, y: 0 } })} aspect="aspect-[4/5]" />
                            {form.image ? <FramingControls value={form.imageTransform} onChange={(t) => set({ imageTransform: t })} /> : <p className="text-[12px] text-gray-500">Without a picture the card shows an empty frame. Add one to adjust the framing.</p>}
                        </div>
                    </BuilderCard>
                </div>
                <aside className="space-y-2 lg:sticky lg:top-0 lg:self-start">
                    <p className="text-[12px] font-bold text-gray-500">Preview</p>
                    <LivePreview type="portfolio" categories={categories} data={form} hideDecorations />
                </aside>
            </div>
        </Sheet>
    );
};

/** Add and remove portfolio categories (the tabs on the home page portfolio). */
export const PortfolioCategoriesSheet = ({ open, onClose, categories, portfolio }) => {
    const { addCategory, deleteCategory, updatePortfolioItem, addToast } = useStore();
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [removing, setRemoving] = useState(null);
    const [moveTo, setMoveTo] = useState('');

    const counts = useMemo(() => portfolio.reduce((acc, p) => ({ ...acc, [p.category]: (acc[p.category] || 0) + 1 }), {}), [portfolio]);
    const newId = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const duplicate = name.trim() && categories.some(c => c.id === newId || c.label.toLowerCase() === name.trim().toLowerCase());

    const add = async () => {
        if (!name.trim() || duplicate || busy) return;
        setBusy(true);
        try {
            await addCategory(name.trim());
            setName('');
            addToast('Category added.', 'success');
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: "Couldn't add the category", action: { label: 'Try again', onClick: () => add() } });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!removing || busy) return;
        setBusy(true);
        try {
            const affected = portfolio.filter(p => p.category === removing.id);
            if (affected.length && moveTo) {
                await Promise.all(affected.map(p => updatePortfolioItem(p.id, { category: moveTo })));
            }
            await deleteCategory(removing.id);
            if (affected.length && moveTo) addToast(`${affected.length} project${affected.length === 1 ? '' : 's'} moved to the category you picked.`, 'success', { title: 'Category deleted' });
            else addToast('Category deleted.', 'success');
            setRemoving(null);
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: "Couldn't delete the category", action: { label: 'Try again', onClick: () => remove() } });
        } finally {
            setBusy(false);
        }
    };

    const removingCount = removing ? (counts[removing.id] || 0) : 0;
    const others = categories.filter(c => c.id !== removing?.id);

    return (
        <>
            <Sheet open={open} onClose={onClose} size="md" title="Portfolio categories" subtitle="Each one is a tab on the home page portfolio">
                <div className="space-y-5">
                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">New category</span>
                        <div className="flex gap-2">
                            <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="Brand activations" />
                            <Button variant="accent" onClick={add} disabled={!name.trim() || duplicate || busy} className="h-12 shrink-0 px-4"><Plus size={15} /> Add</Button>
                        </div>
                        {duplicate && <p className="mt-1 text-[12px] font-semibold text-red-600 dark:text-red-400">That category already exists.</p>}
                    </div>
                    {categories.length === 0 ? (
                        <p className="rounded-xl bg-black/[0.03] p-4 text-[13px] text-gray-500 dark:bg-white/[0.03]">No categories yet. Add one so projects can show on the website.</p>
                    ) : (
                        <ul className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.06] dark:border-white/[0.08]">
                            {categories.map(c => (
                                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{c.label}</span>
                                    <Badge tone="violet">{counts[c.id] || 0} project{(counts[c.id] || 0) === 1 ? '' : 's'}</Badge>
                                    <button type="button" onClick={() => { setRemoving(c); setMoveTo(categories.find(x => x.id !== c.id)?.id || ''); }} aria-label={`Delete ${c.label}`} className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-500">
                                        <Trash2 size={15} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Sheet>
            <ConfirmSheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={`Delete "${removing?.label}"?`} confirmLabel={removingCount && moveTo ? 'Move and delete' : 'Delete'} busy={busy} onConfirm={remove}>
                {removingCount ? (
                    <>
                        <p>{removingCount} project{removingCount === 1 ? ' uses' : 's use'} this category. Move {removingCount === 1 ? 'it' : 'them'} so {removingCount === 1 ? 'it stays' : 'they stay'} on the website:</p>
                        <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Move projects to">
                            {others.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            <option value="">Don't move (they'll be hidden from the site)</option>
                        </ThemedSelect>
                    </>
                ) : <p>No projects use it. The tab disappears from the home page portfolio.</p>}
            </ConfirmSheet>
        </>
    );
};
