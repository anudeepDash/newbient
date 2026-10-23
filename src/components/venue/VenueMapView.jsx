import React, { useId } from 'react';
import DoorOpen from 'lucide-react/dist/esm/icons/door-open';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Wine from 'lucide-react/dist/esm/icons/wine';
import UtensilsCrossed from 'lucide-react/dist/esm/icons/utensils-crossed';
import Toilet from 'lucide-react/dist/esm/icons/toilet';
import Shirt from 'lucide-react/dist/esm/icons/shirt';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import Cross from 'lucide-react/dist/esm/icons/cross';
import Cigarette from 'lucide-react/dist/esm/icons/cigarette';
import Sofa from 'lucide-react/dist/esm/icons/sofa';
import Backpack from 'lucide-react/dist/esm/icons/backpack';
import CircleParking from 'lucide-react/dist/esm/icons/circle-parking';
import { cn } from '../../lib/utils';
import { tierColor } from '../../lib/venueMap';

/*
 * A venue map as SVG: the stage, the zones (coloured by ticket type, with the
 * price on them) and the facilities. Used by the buyer's map (tap a zone to
 * pick that ticket type) and the admin builder (which draws its own handles
 * over it). Works on the 1000-wide canvas from src/lib/venueMap.js.
 *
 *   tiers      eventTiers(event), for names, prices and colours
 *   picked     { tierId: count } — picked zones are outlined
 *   tierLeft   (tierId) => seats left, or null; 0 shows the zone as sold out
 *   onPick     (tierId) => void; zones are buttons only when this is given
 *   selectedId the element the builder has selected
 */

export const FACILITY_ICONS = {
    entry: DoorOpen, exit: LogOut, bar: Wine, food: UtensilsCrossed, washroom: Toilet, merch: Shirt,
    console: SlidersHorizontal, firstaid: Cross, smoking: Cigarette, lounge: Sofa, cloakroom: Backpack, parking: CircleParking,
};

const rupees = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

// Text that fits a box: about 0.55em per character.
const fit = (text, width, size) => {
    const max = Math.max(3, Math.floor((width - 16) / (size * 0.56)));
    const s = String(text || '');
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const Shape = ({ el, ...props }) => (el.shape === 'ellipse'
    ? <ellipse cx={el.x + el.w / 2} cy={el.y + el.h / 2} rx={el.w / 2} ry={el.h / 2} {...props} />
    : <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={Math.min(18, el.w / 4, el.h / 4)} {...props} />);

const rotation = (el) => (el.r ? `rotate(${el.r} ${el.x + el.w / 2} ${el.y + el.h / 2})` : undefined);

const VenueMapView = ({
    map, tiers = [], picked = {}, tierLeft, onPick, selectedId, onSelect, className, dark = false,
    showPrices = true, interactiveIds = false, children,
}) => {
    const uid = useId().replace(/:/g, '');
    if (!map) return null;
    const indexOf = (id) => Math.max(0, tiers.findIndex(t => t.id === id));
    const tierOf = (id) => tiers.find(t => t.id === id) || null;
    const bg = map.background;
    const pickable = typeof onPick === 'function';

    return (
        <svg
            viewBox={`0 0 ${map.w} ${map.h}`}
            className={cn('block h-auto w-full select-none', className)}
            role={pickable ? 'group' : 'img'}
            aria-label="Venue map"
            style={{ touchAction: 'manipulation' }}
        >
            <defs>
                <pattern id={`${uid}-hatch`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="14" height="14" fill={dark ? '#1f2330' : '#e5e7eb'} />
                    <line x1="0" y1="0" x2="0" y2="14" stroke={dark ? '#3a4052' : '#cbd0d8'} strokeWidth="6" />
                </pattern>
                <linearGradient id={`${uid}-stage`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#111827" />
                    <stop offset="1" stopColor="#374151" />
                </linearGradient>
                <pattern id={`${uid}-dots`} width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.6" fill={dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} />
                </pattern>
            </defs>

            <rect x="0" y="0" width={map.w} height={map.h} fill={dark ? '#0b0d12' : '#f8f8f5'} />
            {bg?.url && bg.show !== false ? (
                <image href={bg.url} x="0" y="0" width={map.w} height={map.h} opacity={bg.opacity ?? 1} preserveAspectRatio={bg.stretch ? 'none' : 'xMidYMid meet'} />
            ) : (
                <rect x="0" y="0" width={map.w} height={map.h} fill={`url(#${uid}-dots)`} />
            )}

            {map.elements.map(el => {
                const selected = selectedId === el.id;
                const transform = rotation(el);
                const cx = el.x + el.w / 2;
                const cy = el.y + el.h / 2;
                const select = onSelect ? (e) => { e.stopPropagation(); onSelect(el.id, e); } : undefined;
                const common = { 'data-el': interactiveIds ? el.id : undefined, onPointerDown: select };

                if (el.type === 'stage') {
                    return (
                        <g key={el.id} transform={transform} {...common}>
                            <Shape el={el} fill={`url(#${uid}-stage)`} stroke={selected ? '#22c55e' : 'none'} strokeWidth={selected ? 5 : 0} />
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={Math.min(28, el.h * 0.36)} fontWeight="800" letterSpacing="4">
                                {fit((el.label || 'Stage').toUpperCase(), el.w, Math.min(28, el.h * 0.36))}
                            </text>
                        </g>
                    );
                }

                if (el.type === 'facility') {
                    const Icon = FACILITY_ICONS[el.kind] || DoorOpen;
                    const size = Math.min(26, el.h * 0.5);
                    const showText = el.w >= size + 56;
                    const text = showText ? fit(el.label, el.w - size - 8, 17) : '';
                    const contentW = size + (text ? 8 + text.length * 17 * 0.56 : 0);
                    const startX = cx - contentW / 2;
                    return (
                        <g key={el.id} transform={transform} {...common}>
                            <Shape el={el} fill={dark ? '#171a23' : '#ffffff'} stroke={selected ? '#22c55e' : dark ? '#2b303d' : '#d4d4d8'} strokeWidth={selected ? 4 : 2} />
                            <Icon x={startX} y={cy - size / 2} width={size} height={size} color={dark ? '#a1a1aa' : '#52525b'} strokeWidth={2} />
                            {text && (
                                <text x={startX + size + 8} y={cy} dominantBaseline="central" fill={dark ? '#d4d4d8' : '#3f3f46'} fontSize="17" fontWeight="700">{text}</text>
                            )}
                        </g>
                    );
                }

                if (el.type === 'label') {
                    return (
                        <g key={el.id} transform={transform} {...common}>
                            {selected && <Shape el={el} fill="none" stroke="#22c55e" strokeWidth={3} strokeDasharray="8 6" />}
                            {!selected && onSelect && <Shape el={el} fill="transparent" />}
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill={dark ? '#e4e4e7' : '#27272a'} fontSize={Math.min(30, el.h * 0.5)} fontWeight="800">
                                {fit(el.label || 'Label', el.w, Math.min(30, el.h * 0.5))}
                            </text>
                        </g>
                    );
                }

                // A zone.
                const tier = tierOf(el.tierId);
                const color = tier ? tierColor(tier, indexOf(tier.id)) : '#9ca3af';
                const left = tier && tierLeft ? tierLeft(tier.id) : null;
                const soldOut = Boolean(tier) && left === 0;
                const off = !tier || tier.hidden;
                const isPicked = tier && (picked[tier.id] || 0) > 0;
                const canTap = pickable && tier && !off && !soldOut;
                const nameSize = Math.max(14, Math.min(26, el.h * 0.2, el.w * 0.09));
                const name = fit(el.label || tier?.name || 'Zone', el.w, nameSize);
                const price = tier && showPrices ? (tier.price > 0 ? rupees(tier.price) : 'Free') : '';
                const sub = soldOut ? 'Sold out' : off && tier ? 'Not on sale' : price;
                const body = (
                    <>
                        <Shape
                            el={el}
                            fill={soldOut || off ? `url(#${uid}-hatch)` : color}
                            fillOpacity={soldOut || off ? 1 : isPicked ? 0.95 : 0.78}
                            stroke={selected ? '#22c55e' : isPicked ? (dark ? '#fff' : '#111827') : soldOut || off ? (dark ? '#3a4052' : '#cbd0d8') : color}
                            strokeWidth={selected || isPicked ? 6 : 2}
                        />
                        <text x={cx} y={cy - (sub && el.h > 56 ? nameSize * 0.45 : 0)} textAnchor="middle" dominantBaseline="central"
                            fill={soldOut || off ? (dark ? '#9ca3af' : '#6b7280') : '#fff'} fontSize={nameSize} fontWeight="800"
                            style={{ paintOrder: 'stroke', stroke: soldOut || off ? 'none' : 'rgba(0,0,0,0.25)', strokeWidth: 3 }}>
                            {name}
                        </text>
                        {sub && el.h > 56 && (
                            <text x={cx} y={cy + nameSize * 0.75} textAnchor="middle" dominantBaseline="central"
                                fill={soldOut || off ? (dark ? '#9ca3af' : '#6b7280') : '#fff'} fontSize={Math.max(13, nameSize * 0.72)} fontWeight="700"
                                style={{ paintOrder: 'stroke', stroke: soldOut || off ? 'none' : 'rgba(0,0,0,0.25)', strokeWidth: 3 }}>
                                {sub}
                            </text>
                        )}
                    </>
                );
                if (canTap) {
                    return (
                        <g
                            key={el.id}
                            transform={transform}
                            role="button"
                            tabIndex={0}
                            aria-pressed={Boolean(isPicked)}
                            aria-label={`${tier.name}, ${price}${left !== null && left !== undefined && left <= 20 ? `, ${left} left` : ''}`}
                            className="cursor-pointer outline-none [&:focus-visible>*:first-child]:stroke-[8]"
                            onClick={() => onPick(tier.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(tier.id); } }}
                            {...common}
                        >
                            {body}
                        </g>
                    );
                }
                return <g key={el.id} transform={transform} aria-label={tier ? `${tier.name}${soldOut ? ', sold out' : ''}` : undefined} {...common}>{body}</g>;
            })}
            {children}
        </svg>
    );
};

export default VenueMapView;
