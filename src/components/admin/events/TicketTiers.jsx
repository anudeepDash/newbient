import React, { useRef, useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import MapIcon from 'lucide-react/dist/esm/icons/map';
import { Button } from '../ui';
import { Field, fieldCls } from '../uploads/UploadKit';
import { cn } from '../../../lib/utils';
import { blankTier } from './eventModel';

/*
 * Ticket types for an event: name, price, how many, a colour, and where the
 * tier sits on the venue map (a box drawn over the map, shown at checkout).
 * Tiers with tickets sold can't be removed (their orders point at them).
 */

const ZoneDrawer = ({ layoutUrl, tiers, drawingId, onDone }) => {
    const [start, setStart] = useState(null);
    const [box, setBox] = useState(null);
    const ref = useRef(null);
    const pointOf = (e) => {
        const r = ref.current.getBoundingClientRect();
        const clamp = (v) => Math.min(100, Math.max(0, v));
        return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) };
    };
    const move = (e) => {
        if (!start) return;
        const p = pointOf(e);
        setBox({ x: Math.min(p.x, start.x), y: Math.min(p.y, start.y), width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y) });
    };
    const end = () => {
        if (box && box.width > 1 && box.height > 1) onDone(drawingId, box);
        setStart(null);
        setBox(null);
    };
    return (
        <div
            ref={ref}
            className={cn('relative select-none overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-black', drawingId && 'cursor-crosshair touch-none')}
            onPointerDown={drawingId ? (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setStart(pointOf(e)); } : undefined}
            onPointerMove={drawingId ? move : undefined}
            onPointerUp={drawingId ? end : undefined}
            onPointerCancel={drawingId ? () => { setStart(null); setBox(null); } : undefined}
        >
            <img src={layoutUrl} alt="Venue map" className="pointer-events-none h-auto w-full" draggable={false} />
            {tiers.map(t => t.mapping && (
                <div
                    key={t.id}
                    className={cn('absolute flex flex-col items-center justify-center rounded border-2 text-center', t.id === drawingId ? 'border-dashed border-white/80 opacity-40' : 'border-white/50')}
                    style={{ left: `${t.mapping.x}%`, top: `${t.mapping.y}%`, width: `${t.mapping.width}%`, height: `${t.mapping.height}%`, backgroundColor: `${t.color || '#2ebfff'}cc` }}
                >
                    <span className="w-full truncate px-1 text-[10px] font-bold text-white drop-shadow">{t.name || 'Tier'}</span>
                    {String(t.price) !== '' && <span className="text-[10px] font-bold text-white drop-shadow">₹{t.price}</span>}
                </div>
            ))}
            {tiers.map(t => t.coords && !t.mapping && (
                <span key={t.id} className="absolute -ml-3 -mt-3 h-6 w-6 rounded-full border-2 border-white shadow" style={{ left: `${t.coords.x}%`, top: `${t.coords.y}%`, backgroundColor: t.color || '#2ebfff' }} />
            ))}
            {box && <div className="absolute border-2 border-dashed border-white bg-sky-500/30" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` }} />}
        </div>
    );
};

const TicketTiers = ({ tiers, onChange, soldByTier = {}, layoutUrl, error }) => {
    const [drawingId, setDrawingId] = useState(null);
    const update = (i, patch) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
    const move = (i, dir) => {
        const j = i + dir;
        if (j < 0 || j >= tiers.length) return;
        const next = [...tiers];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    const clearZone = (i) => update(i, { mapping: undefined, coords: undefined });
    const drawing = tiers.find(t => t.id === drawingId);

    return (
        <div className="space-y-3">
            {tiers.map((t, i) => {
                const sold = soldByTier[t.id] || 0;
                return (
                    <div key={t.id} className={cn('rounded-xl border p-3', drawingId === t.id ? 'border-sky-500 dark:border-neon-blue' : 'border-black/10 dark:border-white/10')}>
                        <div className="flex items-start gap-2">
                            <label className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-black/10 dark:border-white/10" title="Tier colour">
                                <span className="absolute inset-1.5 rounded-lg" style={{ backgroundColor: t.color || '#2ebfff' }} />
                                <input type="color" value={t.color || '#2ebfff'} onChange={(e) => update(i, { color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Tier colour" />
                            </label>
                            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_110px]">
                                <input className={cn(fieldCls, 'col-span-2 sm:col-span-1')} value={t.name} onChange={(e) => update(i, { name: e.target.value })} placeholder={i === 0 ? 'e.g. Early bird' : 'e.g. VIP'} aria-label="Ticket type name" />
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-gray-400">₹</span>
                                    <input className={cn(fieldCls, 'pl-7')} type="number" inputMode="decimal" min="0" value={t.price} onChange={(e) => update(i, { price: e.target.value })} placeholder="0" aria-label="Price in rupees" />
                                </div>
                                <input className={fieldCls} type="number" inputMode="numeric" min="0" value={t.capacity ?? ''} onChange={(e) => update(i, { capacity: e.target.value })} placeholder="No limit" aria-label="How many tickets" />
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-14 text-[12px]">
                            <span className="text-gray-500">
                                {String(t.price) === '' || Number(t.price) === 0 ? 'Free' : `₹${Number(t.price).toLocaleString('en-IN')}`}
                                {sold > 0 && ` · ${sold} sold or held`}
                                {t.capacity !== '' && t.capacity !== null && t.capacity !== undefined && ` · ${Math.max(0, Number(t.capacity) - sold)} left`}
                            </span>
                            <span className="ml-auto flex items-center gap-1">
                                {layoutUrl && (
                                    <button type="button" onClick={() => setDrawingId(drawingId === t.id ? null : t.id)} className={cn('flex h-9 items-center gap-1.5 rounded-lg px-2 font-bold', drawingId === t.id ? 'text-sky-700 dark:text-neon-blue' : 'text-gray-600 dark:text-zinc-300')}>
                                        <MapIcon size={13} /> {drawingId === t.id ? 'Drawing…' : t.mapping || t.coords ? 'Redraw' : 'Mark on map'}
                                    </button>
                                )}
                                {(t.mapping || t.coords) && <button type="button" onClick={() => clearZone(i)} className="h-9 px-1 font-semibold text-gray-500">Clear</button>}
                                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-20 dark:hover:bg-white/5"><ArrowUp size={14} /></button>
                                <button type="button" onClick={() => move(i, 1)} disabled={i === tiers.length - 1} aria-label="Move down" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-20 dark:hover:bg-white/5"><ArrowDown size={14} /></button>
                                <button
                                    type="button"
                                    onClick={() => onChange(tiers.filter((_, j) => j !== i))}
                                    disabled={sold > 0}
                                    title={sold > 0 ? 'Tickets are sold for this type, so it can’t be removed. Set how many to stop sales.' : 'Remove'}
                                    aria-label="Remove ticket type"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-25"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </span>
                        </div>
                    </div>
                );
            })}

            {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}

            <Button variant="secondary" onClick={() => onChange([...tiers, blankTier(tiers)])} className="h-11">
                <Plus size={15} /> {tiers.length ? 'Add a ticket type' : 'Add ticket types (early bird, VIP…)'}
            </Button>

            {layoutUrl && tiers.length > 0 && (
                <Field label={drawing ? `Drag a box over where “${drawing.name || 'this tier'}” is` : 'Venue map'} hint={drawing ? null : 'Use “Mark on map” on a ticket type to show where it sits; people see this at checkout.'}>
                    <ZoneDrawer layoutUrl={layoutUrl} tiers={tiers} drawingId={drawingId} onDone={(id, box) => { onChange(tiers.map(t => (t.id === id ? { ...t, mapping: box, coords: undefined } : t))); setDrawingId(null); }} />
                </Field>
            )}
        </div>
    );
};

export default TicketTiers;
