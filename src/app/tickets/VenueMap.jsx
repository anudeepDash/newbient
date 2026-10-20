import React, { useState } from 'react';
import ZoomIn from 'lucide-react/dist/esm/icons/zoom-in';
import ZoomOut from 'lucide-react/dist/esm/icons/zoom-out';
import { cn } from '../../lib/utils';
import { rupees } from './ticketParts';

/*
 * The venue layout with a tappable zone per ticket type (the admin draws them
 * as `mapping` rectangles or `coords` points, in % of the image). Tapping a
 * zone picks that ticket type.
 */
const VenueMap = ({ image, categories = [], cart = {}, onPick, tierLeft }) => {
    const [zoom, setZoom] = useState(1);
    const zones = categories.filter(c => c.mapping || c.coords);

    return (
        <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-black/30">
            <div className="max-h-[52dvh] overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <div className="relative origin-top-left transition-[width] duration-200" style={{ width: `${zoom * 100}%` }}>
                    <img src={image} alt="Venue layout" className="block h-auto w-full select-none" draggable={false} />
                    {zones.map(cat => {
                        const picked = (cart[cat.id] || 0) > 0;
                        const soldOut = tierLeft?.(cat.id) === 0;
                        const rect = cat.mapping;
                        const x = rect?.x ?? cat.coords?.x ?? 0;
                        const y = rect?.y ?? cat.coords?.y ?? 0;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                disabled={soldOut}
                                onClick={() => onPick(cat.id)}
                                aria-label={`${cat.name}, ${rupees(cat.price)}${soldOut ? ', sold out' : ''}`}
                                aria-pressed={picked}
                                className={cn(
                                    'absolute flex flex-col items-center justify-center overflow-hidden border-2 text-center text-white shadow-md transition-transform',
                                    picked ? 'z-10 scale-[1.04] border-white ring-4 ring-white/40' : 'border-white/40',
                                    soldOut && 'opacity-40'
                                )}
                                style={{
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    width: rect ? `${rect.width}%` : 44,
                                    height: rect ? `${rect.height}%` : 44,
                                    marginLeft: rect ? 0 : -22,
                                    marginTop: rect ? 0 : -22,
                                    borderRadius: rect ? 8 : 9999,
                                    backgroundColor: cat.color || '#2ebfff',
                                }}
                            >
                                {rect && (
                                    <>
                                        <span className="max-w-full truncate px-1 text-[10px] font-black uppercase leading-tight drop-shadow">{cat.name}</span>
                                        <span className="text-[10px] font-bold leading-tight drop-shadow">{rupees(cat.price)}</span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="absolute right-2 top-2 flex flex-col gap-1.5">
                <button
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => setZoom(z => Math.min(3, z + 0.5))}
                    disabled={zoom >= 3}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-gray-700 shadow-sm disabled:opacity-40 dark:border-white/[0.12] dark:bg-[#0d0f15] dark:text-zinc-200"
                >
                    <ZoomIn size={17} />
                </button>
                <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => setZoom(z => Math.max(1, z - 0.5))}
                    disabled={zoom <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-gray-700 shadow-sm disabled:opacity-40 dark:border-white/[0.12] dark:bg-[#0d0f15] dark:text-zinc-200"
                >
                    <ZoomOut size={17} />
                </button>
            </div>
        </div>
    );
};

export default VenueMap;
