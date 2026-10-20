import React, { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Music from 'lucide-react/dist/esm/icons/music';
import Tags from 'lucide-react/dist/esm/icons/tags';
import PlayCircle from 'lucide-react/dist/esm/icons/play-circle';
import ImageOff from 'lucide-react/dist/esm/icons/image-off';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Edit from 'lucide-react/dist/esm/icons/edit-3';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ChevronsUp from 'lucide-react/dist/esm/icons/chevrons-up';
import ArrowUpDown from 'lucide-react/dist/esm/icons/arrow-up-down';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Check from 'lucide-react/dist/esm/icons/check';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Card, Button, Badge, StatTile, SearchInput, SegmentedTabs, EmptyState, Menu, MenuItem, ViewToggle, useViewMode } from '../../components/admin/ui';
import ExportMenu from '../../components/admin/ExportMenu';
import { CONTENT_TABS, ConfirmSheet, framedBackground } from '../../components/admin/content/ContentKit';
import { PortfolioEditorSheet, PortfolioCategoriesSheet } from '../../components/admin/content/PortfolioSheets';
import { formatDay, toDate } from '../../components/admin/content/contentRules';

/** The portfolio of past events on the home page (/admin/concertzone). */
const ConcertManager = () => {
    useStoreSubscription(['portfolio', 'portfolioCategories']);
    const { portfolio = [], portfolioCategories = [], deletePortfolioItem, updatePortfolioOrder, addToast } = useStore();
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [view, setView] = useViewMode('portfolio', 'cards');
    const [reordering, setReordering] = useState(false);
    const [editor, setEditor] = useState(null); // { item } | {}
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const [removing, setRemoving] = useState(null);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);

    const categories = useMemo(() => [...portfolioCategories].sort((a, b) => (a.order || 0) - (b.order || 0)), [portfolioCategories]);
    const known = useMemo(() => new Set(categories.map(c => c.id)), [categories]);
    const labelFor = (id) => categories.find(c => c.id === id)?.label;

    const category = params.get('category') || 'all';
    const setCategory = (v) => { const next = new URLSearchParams(params); if (v === 'all') next.delete('category'); else next.set('category', v); setParams(next, { replace: true }); };

    const counts = useMemo(() => {
        const out = { all: portfolio.length, none: 0 };
        portfolio.forEach(p => {
            if (known.has(p.category)) out[p.category] = (out[p.category] || 0) + 1;
            else out.none += 1;
        });
        return out;
    }, [portfolio, known]);
    const withReels = portfolio.filter(p => p.highlightUrl).length;
    const noImage = portfolio.filter(p => !p.image).length;

    const shown = useMemo(() => {
        if (reordering) return portfolio;
        const q = search.trim().toLowerCase();
        return portfolio.filter(p => {
            if (category === 'none' && known.has(p.category)) return false;
            if (category !== 'all' && category !== 'none' && p.category !== category) return false;
            if (!q) return true;
            return [p.title, p.sector, labelFor(p.category), p.year].some(v => String(v || '').toLowerCase().includes(q));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [portfolio, category, search, known, reordering, categories]);

    const guard = async (fn) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        try { await fn(); } finally { busyRef.current = false; setBusy(false); }
    };

    // Order is saved for the whole list, so it's the same everywhere. Pinned
    // projects always sort first, so items move within their own group.
    const move = (item, dir) => guard(async () => {
        const list = [...portfolio];
        const i = list.findIndex(x => x.id === item.id);
        let j = i + dir;
        while (j >= 0 && j < list.length && !!list[j].isPinned !== !!item.isPinned) j += dir;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        try { await updatePortfolioOrder(list); }
        catch (err) { console.error(err); addToast('Check your connection and try again.', 'error', { title: 'New order not saved', action: { label: 'Try again', onClick: () => move(item, dir) } }); }
    });
    const toTop = (item) => guard(async () => {
        const rest = portfolio.filter(x => x.id !== item.id);
        const firstOfGroup = rest.findIndex(x => !!x.isPinned === !!item.isPinned);
        const at = firstOfGroup === -1 ? rest.length : firstOfGroup;
        const list = [...rest.slice(0, at), item, ...rest.slice(at)];
        try { await updatePortfolioOrder(list); addToast('Moved to the top.', 'success'); }
        catch (err) { console.error(err); addToast('Check your connection and try again.', 'error', { title: 'New order not saved', action: { label: 'Try again', onClick: () => toTop(item) } }); }
    });

    const remove = () => guard(async () => {
        try {
            await deletePortfolioItem(removing.id);
            addToast('Project deleted.', 'success');
            setRemoving(null);
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', {
                title: 'Project not deleted',
                action: { label: 'Try again', onClick: () => remove() },
            });
        }
    });

    const exportSpec = () => ({
        filename: 'portfolio',
        sheetName: 'Portfolio',
        title: 'Portfolio',
        subtitle: `${shown.length} project${shown.length === 1 ? '' : 's'}`,
        rows: shown,
        columns: [
            { header: 'Position', type: 'number', value: p => portfolio.indexOf(p) + 1 },
            { header: 'Project', value: p => p.title || '' },
            { header: 'Category', value: p => labelFor(p.category) || 'None (hidden)' },
            { header: 'Card label', value: p => p.sector || '' },
            { header: 'Date', type: 'date', value: p => toDate(p.date) || null },
            { header: 'Year', value: p => p.year || '' },
            { header: 'Highlight reel', value: p => p.highlightUrl || '' },
            { header: 'Image', value: p => p.image || '' },
        ],
    });

    const dateText = (p) => formatDay(p.date) || (p.year ? String(p.year) : '');

    const actions = (p) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            <MenuItem icon={Edit} onClick={() => setEditor({ item: p })}>Edit</MenuItem>
            {p.highlightUrl && <MenuItem as="a" href={p.highlightUrl} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open the reel</MenuItem>}
            <MenuItem icon={ChevronsUp} onClick={() => toTop(p)}>Move to the top</MenuItem>
            <MenuItem icon={Trash2} danger onClick={() => setRemoving(p)}>Delete</MenuItem>
        </Menu>
    );

    const thumb = (p, cls) => (
        <div className={cn('relative overflow-hidden bg-violet-500/[0.08] dark:bg-violet-400/[0.08]', cls)}>
            {p.image
                ? <div className="absolute inset-0" style={framedBackground(p.image, p.imageTransform)} />
                : <div className="absolute inset-0 flex items-center justify-center text-violet-500/60 dark:text-violet-300/50"><ImageIcon size={22} /></div>}
        </div>
    );

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Work', icon: Music, description: 'Past events and campaigns: “Nights we built” on the home page and the /work archive' }}
            tabs={CONTENT_TABS}
            action={(
                <div className="flex w-full gap-2 sm:w-auto">
                    <Button variant="secondary" onClick={() => setCategoriesOpen(true)} className="flex-1 sm:flex-none"><Tags size={14} /> Categories</Button>
                    <Button variant="accent" onClick={() => setEditor({})} className="flex-1 sm:flex-none"><Plus size={15} /> New project</Button>
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Music} tone="violet" label="Projects" value={portfolio.length} hint={`${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`} active={category === 'all' && !reordering} onClick={() => setCategory('all')} />
                    <StatTile icon={PlayCircle} tone="pink" label="With a reel" value={withReels} hint="Play button on the card" />
                    <StatTile icon={ImageOff} tone="amber" label="Need a picture" value={noImage} hint={noImage ? 'Show an empty frame' : 'All have pictures'} />
                    <StatTile icon={Tags} tone={counts.none ? 'red' : 'teal'} label="Hidden (no category)" value={counts.none} hint={counts.none ? 'Not on the website' : 'Everything is visible'} active={category === 'none'} onClick={counts.none ? () => setCategory(category === 'none' ? 'all' : 'none') : undefined} />
                </div>

                {reordering ? (
                    <Card className={cn('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', 'border-violet-500/40 bg-violet-500/[0.06] dark:border-violet-300/40 dark:bg-violet-400/[0.06]')}>
                        <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold">Reorder the portfolio</p>
                            <p className="text-[12px] text-gray-500">This is the order on the website. Each change saves right away.</p>
                        </div>
                        <Button variant="accent" onClick={() => setReordering(false)} className="h-11"><Check size={15} /> Done</Button>
                    </Card>
                ) : (
                    <>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <SearchInput value={search} onChange={setSearch} placeholder="Search projects" className="lg:w-80" />
                            <div className="flex flex-1 items-center justify-end gap-2">
                                <Button variant="secondary" onClick={() => { setReordering(true); setSearch(''); }} disabled={portfolio.length < 2} className="h-11"><ArrowUpDown size={14} /> Reorder</Button>
                                <ExportMenu getSpec={exportSpec} />
                                <ViewToggle value={view} onChange={setView} />
                            </div>
                        </div>
                        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                            <SegmentedTabs
                                value={category}
                                onChange={setCategory}
                                items={[
                                    { value: 'all', label: 'All', count: counts.all },
                                    ...categories.map(c => ({ value: c.id, label: c.label, count: counts[c.id] || 0 })),
                                    ...(counts.none ? [{ value: 'none', label: 'No category', count: counts.none, highlight: true }] : []),
                                ]}
                            />
                        </div>
                    </>
                )}

                {shown.length === 0 ? (
                    <Card className="rounded-2xl">
                        <EmptyState
                            icon={Music}
                            title={portfolio.length ? 'Nothing here' : 'No projects yet'}
                            description={portfolio.length ? 'Try another category or search.' : categories.length ? 'Add your first past event. It shows on the home page under its category.' : 'Start by adding a category (like Music or Brands), then add projects.'}
                            action={!portfolio.length && (categories.length
                                ? <Button variant="accent" onClick={() => setEditor({})}><Plus size={14} /> New project</Button>
                                : <Button variant="accent" onClick={() => setCategoriesOpen(true)}><Tags size={14} /> Add a category</Button>)}
                        />
                    </Card>
                ) : reordering || view === 'list' ? (
                    <Card className="overflow-hidden rounded-2xl">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map((p, index) => {
                                const label = labelFor(p.category);
                                return (
                                    <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                                        {reordering && <span className="w-6 shrink-0 text-center text-[12px] font-bold tabular-nums text-gray-400">{index + 1}</span>}
                                        {thumb(p, 'h-14 w-11 shrink-0 rounded-lg')}
                                        <button type="button" onClick={() => setEditor({ item: p })} className="-my-2 min-w-0 flex-1 py-2 text-left">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-[15px] font-bold">{p.title || 'Untitled'}</span>
                                                {p.isPinned && <Badge tone="amber">Pinned</Badge>}
                                                {!label && <Badge tone="red">Hidden</Badge>}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-gray-500">{[label || 'No category', p.sector, dateText(p), p.highlightUrl ? 'Reel' : null].filter(Boolean).join(' · ')}</span>
                                        </button>
                                        {reordering ? (
                                            <div className="flex shrink-0 items-center gap-1">
                                                <Button size="sm" variant="secondary" onClick={() => move(p, -1)} disabled={busy || index === 0} aria-label="Move up" className="h-11 w-11 px-0"><ArrowUp size={16} /></Button>
                                                <Button size="sm" variant="secondary" onClick={() => move(p, 1)} disabled={busy || index === shown.length - 1} aria-label="Move down" className="h-11 w-11 px-0"><ArrowDown size={16} /></Button>
                                            </div>
                                        ) : actions(p)}
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                        {shown.map(p => {
                            const label = labelFor(p.category);
                            return (
                                <Card key={p.id} className="group relative flex flex-col overflow-hidden rounded-2xl transition-colors hover:border-black/15 dark:hover:border-white/15">
                                    <button type="button" onClick={() => setEditor({ item: p })} className="block text-left" aria-label={`Edit ${p.title || 'project'}`}>
                                        {thumb(p, 'aspect-[4/5]')}
                                    </button>
                                    <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
                                        <Badge tone={label ? 'violet' : 'red'} className="bg-white/90 dark:bg-black/70">{label || 'Hidden'}</Badge>
                                        {p.highlightUrl && <Badge tone="pink" className="bg-white/90 dark:bg-black/70"><PlayCircle size={10} /> Reel</Badge>}
                                    </div>
                                    <div className="flex items-start gap-1 p-3">
                                        <button type="button" onClick={() => setEditor({ item: p })} className="-my-2 min-w-0 flex-1 py-2 text-left">
                                            <p className="line-clamp-2 text-[14px] font-bold leading-snug">{p.title || 'Untitled'}</p>
                                            <p className="mt-0.5 truncate text-[12px] text-gray-500">{[p.sector, dateText(p)].filter(Boolean).join(' · ') || ' '}</p>
                                        </button>
                                        {actions(p)}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <PortfolioEditorSheet
                open={Boolean(editor)}
                onClose={() => setEditor(null)}
                item={editor?.item || null}
                categories={categories}
                onManageCategories={() => setCategoriesOpen(true)}
            />
            <PortfolioCategoriesSheet open={categoriesOpen} onClose={() => setCategoriesOpen(false)} categories={categories} portfolio={portfolio} />

            <ConfirmSheet open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this project?" confirmLabel="Delete" busy={busy} onConfirm={remove}>
                <p><span className="font-semibold text-gray-900 dark:text-white">{removing?.title || 'This project'}</span> will be removed from the home page portfolio. This can't be undone.</p>
                {removing?.wasEvent ? <p>It was archived from a past event. Ticket orders for that event are kept.</p> : null}
            </ConfirmSheet>
        </AdminCommunityHubLayout>
    );
};

export default ConcertManager;
