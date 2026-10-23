import React, { useCallback, useEffect, useRef, useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Square from 'lucide-react/dist/esm/icons/square';
import Circle from 'lucide-react/dist/esm/icons/circle';
import Type from 'lucide-react/dist/esm/icons/type';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Redo2 from 'lucide-react/dist/esm/icons/redo-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Layers from 'lucide-react/dist/esm/icons/layers';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import DoorOpen from 'lucide-react/dist/esm/icons/door-open';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import {
    FACILITIES, MAP_TEMPLATES, MAP_W, MIN_SIZE, facilityLabel, mapFromTemplate, newElementId, normalizeElement, normalizeVenueMap, tierColor,
} from '../../../lib/venueMap';
import VenueMapView from '../../venue/VenueMapView';
import ThemedSelect from '../ThemedSelect';
import { Button, Menu, MenuItem } from '../ui';
import { Field, Toggle, fieldCls } from '../uploads/UploadKit';
import { useConfirm } from './kit';

/*
 * Draw the venue: the stage, a zone per ticket type, and the facilities
 * around them, the way BookMyShow and District show a venue. Start from a
 * layout (club, concert, seated hall) or a blank canvas, optionally over an
 * uploaded floor plan to trace. Drag to move, pull a corner to resize,
 * arrows nudge (Shift for 10), Delete removes, ⌘Z / ⌘⇧Z undo and redo.
 *
 *   value     the event's venueMap (or null)
 *   onChange  (map | null) => void
 *   tiers     the ticket types being edited ({ id, name, price, color })
 */

const SNAP = 10;
const snap = (n) => Math.round(n / SNAP) * SNAP;

const TYPE_LABEL = { stage: 'Stage', zone: 'Zone', facility: 'Facility', label: 'Text' };

const VenueMapBuilder = ({ value, onChange, tiers = [] }) => {
    const addToast = useStore(s => s.addToast);
    const map = value;
    const [selectedId, setSelectedId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [ask, confirmSheet] = useConfirm();
    const svgWrap = useRef(null);
    const drag = useRef(null);
    const past = useRef([]);
    const future = useRef([]);
    const [, bump] = useState(0);

    const selected = map?.elements.find(e => e.id === selectedId) || null;
    const namedTiers = tiers.filter(t => String(t.name || '').trim());

    // ── history ──
    const commit = useCallback((next, { record = true } = {}) => {
        if (record) {
            past.current.push(map);
            if (past.current.length > 60) past.current.shift();
            future.current = [];
            bump(n => n + 1);
        }
        onChange(next);
    }, [map, onChange]);

    const undo = () => {
        if (!past.current.length) return;
        future.current.push(map);
        onChange(past.current.pop());
        bump(n => n + 1);
    };
    const redo = () => {
        if (!future.current.length) return;
        past.current.push(map);
        onChange(future.current.pop());
        bump(n => n + 1);
    };

    const setElements = (fn, opts) => commit({ ...map, elements: fn(map.elements) }, opts);
    const patchSelected = (patch, opts) => setElements(els => els.map(e => (e.id === selectedId ? normalizeElement({ ...e, ...patch }, map.h) : e)), opts);

    // ── adding ──
    const add = (type, extra = {}) => {
        const base = map || { w: MAP_W, h: 700, elements: [] };
        const sizes = { stage: [300, 90], zone: [260, 160], facility: [130, 56], label: [200, 50] };
        const [w, h] = sizes[type];
        const n = base.elements.length;
        const el = normalizeElement({
            id: newElementId(type), type, w, h,
            x: snap(MAP_W / 2 - w / 2 + ((n % 5) - 2) * 30),
            y: snap(base.h / 2 - h / 2 + ((n % 4) - 1.5) * 30),
            label: type === 'stage' ? 'Stage' : type === 'label' ? 'Text' : type === 'zone' ? (extra.tierId ? tiers.find(t => t.id === extra.tierId)?.name || 'Zone' : 'Zone') : '',
            ...extra,
            ...(type === 'facility' ? { label: facilityLabel(extra.kind || 'bar') } : {}),
        }, base.h);
        if (!map) past.current.push(null);
        commit({ ...base, elements: [...base.elements, el] }, { record: Boolean(map) });
        setSelectedId(el.id);
    };

    const applyTemplate = (id) => {
        const doIt = () => { commit(mapFromTemplate(id, namedTiers)); setSelectedId(null); };
        if (map?.elements?.length) {
            ask({
                title: 'Start from this layout?',
                body: 'What you’ve drawn is replaced. You can undo this.',
                confirmLabel: 'Use layout',
                action: async () => doIt(),
            });
        } else doIt();
    };

    const duplicate = () => {
        if (!selected) return;
        const copy = normalizeElement({ ...selected, id: newElementId(selected.type), x: selected.x + 30, y: selected.y + 30 }, map.h);
        setElements(els => [...els, copy]);
        setSelectedId(copy.id);
    };
    const remove = () => {
        if (!selected) return;
        setElements(els => els.filter(e => e.id !== selected.id));
        setSelectedId(null);
    };
    const reorder = (toFront) => setElements(els => {
        const rest = els.filter(e => e.id !== selectedId);
        return toFront ? [...rest, selected] : [selected, ...rest];
    });

    // ── background ──
    const upload = async (file) => {
        if (!file?.type?.startsWith('image/')) { addToast('Pick an image file, like a JPG or PNG.', 'warning'); return; }
        setUploading(true);
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            if (!url) throw new Error('No URL');
            const base = map || { w: MAP_W, h: 700, elements: [] };
            commit({ ...base, background: { url, opacity: 0.6, show: false } });
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Floor plan not uploaded' });
        } finally {
            setUploading(false);
        }
    };
    const setBackground = (patch) => {
        const next = { ...map, background: { ...map.background, ...patch } };
        commit(next, { record: false });
    };

    // ── dragging (pointer events, in canvas units) ──
    const toCanvas = (e) => {
        const svg = svgWrap.current?.querySelector('svg');
        const ctm = svg?.getScreenCTM?.();
        if (!ctm) return null;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    };

    const startDrag = (id, e, handle = null) => {
        const el = map.elements.find(x => x.id === id);
        const p = toCanvas(e);
        if (!el || !p) return;
        setSelectedId(id);
        drag.current = { id, handle, start: p, orig: { ...el }, recorded: false };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
        const d = drag.current;
        if (!d) return;
        const p = toCanvas(e);
        if (!p) return;
        const dx = p.x - d.start.x;
        const dy = p.y - d.start.y;
        if (!d.recorded && Math.hypot(dx, dy) < 3) return;
        const o = d.orig;
        let next;
        if (!d.handle) {
            next = { x: snap(o.x + dx), y: snap(o.y + dy) };
        } else {
            const left = d.handle.includes('w');
            const top = d.handle.includes('n');
            const w = Math.max(MIN_SIZE, snap(left ? o.w - dx : o.w + dx));
            const h = Math.max(MIN_SIZE, snap(top ? o.h - dy : o.h + dy));
            next = { w, h, x: left ? o.x + o.w - w : o.x, y: top ? o.y + o.h - h : o.y };
        }
        const record = !d.recorded;
        d.recorded = true;
        setElements(els => els.map(x => (x.id === d.id ? normalizeElement({ ...x, ...next }, map.h) : x)), { record });
    };
    const endDrag = () => { drag.current = null; };

    // ── keyboard (only while the canvas has focus) ──
    const onKeyDown = (e) => {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
        if (!selected) return;
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); return; }
        const step = e.shiftKey ? 10 : 1;
        const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (moves[e.key]) {
            e.preventDefault();
            patchSelected({ x: selected.x + moves[e.key][0], y: selected.y + moves[e.key][1] });
        }
    };

    useEffect(() => { if (selectedId && !map?.elements.some(e => e.id === selectedId)) setSelectedId(null); }, [map, selectedId]);

    // ── checks shown under the canvas ──
    const zones = map?.elements.filter(e => e.type === 'zone') || [];
    const unlinked = zones.filter(z => !namedTiers.some(t => t.id === z.tierId));
    const missing = namedTiers.filter(t => !zones.some(z => z.tierId === t.id));

    const handles = (() => {
        if (!selected) return null;
        const s = 22;
        const pts = [['nw', selected.x, selected.y], ['ne', selected.x + selected.w, selected.y], ['sw', selected.x, selected.y + selected.h], ['se', selected.x + selected.w, selected.y + selected.h]];
        const transform = selected.r ? `rotate(${selected.r} ${selected.x + selected.w / 2} ${selected.y + selected.h / 2})` : undefined;
        return (
            <g transform={transform}>
                <rect x={selected.x} y={selected.y} width={selected.w} height={selected.h} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="6 5" pointerEvents="none" />
                {pts.map(([h, x, y]) => (
                    <rect
                        key={h}
                        x={x - s / 2} y={y - s / 2} width={s} height={s} rx="5"
                        fill="#fff" stroke="#16a34a" strokeWidth="3"
                        style={{ cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize' }}
                        onPointerDown={(e) => { e.stopPropagation(); startDrag(selected.id, e, h); }}
                    />
                ))}
            </g>
        );
    })();

    if (!map) {
        return (
            <div className="space-y-3">
                <p className="text-[13px] text-gray-500">Buyers see this map and tap a zone to pick its ticket type. Start from a layout and change it to fit your venue.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                    {MAP_TEMPLATES.map(t => (
                        <button key={t.id} type="button" onClick={() => applyTemplate(t.id)}
                            className="group overflow-hidden rounded-2xl border border-black/10 text-left transition-colors hover:border-emerald-500/50 dark:border-white/10 dark:hover:border-neon-green/40">
                            <div className="pointer-events-none bg-black/[0.02] p-2 dark:bg-white/[0.02]">
                                <VenueMapView map={mapFromTemplate(t.id, namedTiers)} tiers={namedTiers} showPrices={false} className="rounded-lg" />
                            </div>
                            <div className="px-3 py-2.5">
                                <p className="text-[14px] font-bold">{t.name}</p>
                                <p className="text-[12px] text-gray-500">{t.hint}</p>
                            </div>
                        </button>
                    ))}
                </div>
                <Button as="label" variant="secondary" className="h-11 cursor-pointer">
                    <ImageIcon size={14} /> {uploading ? 'Uploading…' : 'Or upload a floor plan to trace'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
                </Button>
                {confirmSheet}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5">
                <Menu trigger={({ toggle }) => <Button variant="accent" size="sm" className="h-10" onClick={toggle}><Plus size={14} /> Add</Button>} align="left">
                    {namedTiers.map((t, i) => (
                        <MenuItem key={t.id} icon={Square} onClick={() => add('zone', { tierId: t.id })} hint={zones.some(z => z.tierId === t.id) ? 'Already on the map' : undefined}>
                            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: tierColor(t, i) }} />Zone: {t.name}</span>
                        </MenuItem>
                    ))}
                    <MenuItem icon={Square} onClick={() => add('zone')}>Zone (no ticket type)</MenuItem>
                    <MenuItem icon={Mic2} onClick={() => add('stage')}>Stage or DJ booth</MenuItem>
                    <MenuItem icon={Type} onClick={() => add('label')}>Text</MenuItem>
                </Menu>
                <Menu trigger={({ toggle }) => <Button variant="secondary" size="sm" className="h-10" onClick={toggle}><DoorOpen size={14} /> Facility</Button>} align="left">
                    {FACILITIES.map(f => <MenuItem key={f.kind} onClick={() => add('facility', { kind: f.kind })}>{f.label}</MenuItem>)}
                </Menu>
                <Menu trigger={({ toggle }) => <Button variant="secondary" size="sm" className="h-10" onClick={toggle}><LayoutTemplate size={14} /> Layouts</Button>} align="left">
                    {MAP_TEMPLATES.map(t => <MenuItem key={t.id} onClick={() => applyTemplate(t.id)} hint={t.hint}>{t.name}</MenuItem>)}
                </Menu>
                <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-10 w-10 px-0" onClick={undo} disabled={!past.current.length} aria-label="Undo"><Undo2 size={16} /></Button>
                    <Button variant="ghost" size="sm" className="h-10 w-10 px-0" onClick={redo} disabled={!future.current.length} aria-label="Redo"><Redo2 size={16} /></Button>
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={svgWrap}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onPointerDown={() => setSelectedId(null)}
                className="overflow-hidden rounded-2xl border border-black/10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-white/10"
                style={{ touchAction: 'none' }}
                aria-label="Venue map canvas. Arrow keys move the selected item."
            >
                <VenueMapView
                    map={{ ...map, background: map.background ? { ...map.background, show: true } : undefined }}
                    tiers={namedTiers}
                    selectedId={selectedId}
                    onSelect={(id, e) => startDrag(id, e)}
                >
                    {handles}
                </VenueMapView>
            </div>

            {/* What's selected */}
            {selected ? (
                <div className="space-y-3 rounded-2xl border border-black/[0.06] bg-black/[0.015] p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <p className="mr-auto text-[13px] font-bold">{TYPE_LABEL[selected.type]}</p>
                        <Button variant="ghost" size="sm" className="h-9" onClick={duplicate}><Copy size={13} /> Duplicate</Button>
                        <Menu trigger={({ toggle }) => <Button variant="ghost" size="sm" className="h-9" onClick={toggle}><Layers size={13} /> Order</Button>}>
                            <MenuItem onClick={() => reorder(true)}>Bring to front</MenuItem>
                            <MenuItem onClick={() => reorder(false)}>Send to back</MenuItem>
                        </Menu>
                        <Button variant="ghost" size="sm" className="h-9 text-red-600 dark:text-red-400" onClick={remove}><Trash2 size={13} /> Delete</Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {selected.type === 'zone' && (
                            <Field label="Ticket type" hint="Buyers tap this zone to pick it">
                                <ThemedSelect className={fieldCls} value={selected.tierId || ''} onChange={(e) => {
                                    const tier = namedTiers.find(t => t.id === e.target.value);
                                    const keepLabel = selected.label && !namedTiers.some(t => t.name === selected.label) && selected.label !== 'Zone';
                                    patchSelected({ tierId: e.target.value || null, ...(tier && !keepLabel ? { label: tier.name } : {}) });
                                }}>
                                    <option value="">None (just an area)</option>
                                    {namedTiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </ThemedSelect>
                            </Field>
                        )}
                        {selected.type === 'facility' && (
                            <Field label="What it is">
                                <ThemedSelect className={fieldCls} value={selected.kind} onChange={(e) => {
                                    const wasDefault = selected.label === facilityLabel(selected.kind);
                                    patchSelected({ kind: e.target.value, ...(wasDefault ? { label: facilityLabel(e.target.value) } : {}) });
                                }}>
                                    {FACILITIES.map(f => <option key={f.kind} value={f.kind}>{f.label}</option>)}
                                </ThemedSelect>
                            </Field>
                        )}
                        <Field label="Name on the map" optional={selected.type === 'zone'}>
                            <input className={fieldCls} value={selected.label} maxLength={40}
                                onChange={(e) => patchSelected({ label: e.target.value }, { record: false })}
                                onFocus={() => { past.current.push(map); future.current = []; }}
                                placeholder={selected.type === 'zone' ? 'Uses the ticket type’s name' : ''} />
                        </Field>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        {selected.type !== 'label' && (
                            <div>
                                <span className="mb-1 block text-[12px] font-bold text-gray-500">Shape</span>
                                <div className="flex gap-1">
                                    {[['rect', Square, 'Box'], ['ellipse', Circle, 'Round']].map(([shape, Icon, label]) => (
                                        <button key={shape} type="button" onClick={() => patchSelected({ shape })} aria-pressed={selected.shape === shape}
                                            className={cn('flex h-11 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold',
                                                selected.shape === shape ? 'border-emerald-500/60 bg-neon-green/[0.08] dark:border-neon-green/50' : 'border-black/10 dark:border-white/10')}>
                                            <Icon size={14} /> {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <label className="min-w-[180px] flex-1">
                            <span className="mb-1 flex justify-between text-[12px] font-bold text-gray-500"><span>Turn</span><span className="tabular-nums">{Math.round(selected.r)}°</span></span>
                            <input type="range" min="0" max="355" step="5" value={selected.r}
                                onPointerDown={() => { past.current.push(map); future.current = []; }}
                                onChange={(e) => patchSelected({ r: Number(e.target.value) }, { record: false })}
                                className="h-11 w-full cursor-pointer accent-emerald-500" />
                        </label>
                    </div>
                </div>
            ) : (
                <p className="text-[12px] text-gray-500">Tap something on the map to change it. Drag to move it, pull a corner to resize.</p>
            )}

            {(unlinked.length > 0 || missing.length > 0) && (
                <div className="space-y-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-[13px]">
                    {missing.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-300" />
                            <span>Not on the map yet:</span>
                            {missing.map(t => (
                                <button key={t.id} type="button" onClick={() => add('zone', { tierId: t.id })} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2 text-[12px] font-bold shadow-sm dark:bg-white/10">
                                    <Plus size={12} /> {t.name}
                                </button>
                            ))}
                        </div>
                    )}
                    {unlinked.length > 0 && <p className="text-gray-600 dark:text-zinc-300">{unlinked.length === 1 ? 'One zone has' : `${unlinked.length} zones have`} no ticket type, so buyers can’t tap {unlinked.length === 1 ? 'it' : 'them'}.</p>}
                </div>
            )}

            {/* Canvas settings */}
            <details className="group rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-4 text-[13px] font-bold [&::-webkit-details-marker]:hidden">Canvas and floor plan</summary>
                <div className="space-y-4 px-4 pb-4">
                    <label className="block">
                        <span className="mb-1 flex justify-between text-[12px] font-bold text-gray-500"><span>Canvas height</span><span className="tabular-nums">{map.h}</span></span>
                        <input type="range" min="400" max="1400" step="20" value={map.h}
                            onChange={(e) => commit(normalizeVenueMap({ ...map, h: Number(e.target.value) }) || map, { record: false })}
                            className="h-11 w-full cursor-pointer accent-emerald-500" />
                    </label>
                    {map.background?.url ? (
                        <>
                            <label className="block">
                                <span className="mb-1 flex justify-between text-[12px] font-bold text-gray-500"><span>Floor plan strength</span><span className="tabular-nums">{Math.round((map.background.opacity ?? 1) * 100)}%</span></span>
                                <input type="range" min="0.1" max="1" step="0.05" value={map.background.opacity ?? 1} onChange={(e) => setBackground({ opacity: Number(e.target.value) })} className="h-11 w-full cursor-pointer accent-emerald-500" />
                            </label>
                            <Toggle label="Show the floor plan to buyers" hint="Off: it's only here for tracing" checked={map.background.show !== false} onChange={(v) => setBackground({ show: v })} />
                            <Button variant="ghost" size="sm" className="h-10 text-red-600 dark:text-red-400" onClick={() => { const { background, ...rest } = map; void background; commit(rest); }}><Trash2 size={13} /> Remove floor plan</Button>
                        </>
                    ) : (
                        <Button as="label" variant="secondary" className="h-11 cursor-pointer">
                            <ImageIcon size={14} /> {uploading ? 'Uploading…' : 'Upload a floor plan to trace'}
                            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-10 text-red-600 dark:text-red-400" onClick={() => ask({
                        title: 'Remove the venue map?',
                        body: 'Buyers pick from the list of ticket types instead.',
                        confirmLabel: 'Remove map',
                        danger: true,
                        action: async () => { commit(null); setSelectedId(null); },
                    })}><Trash2 size={13} /> Remove the map</Button>
                </div>
            </details>
            {confirmSheet}
        </div>
    );
};

export default VenueMapBuilder;
