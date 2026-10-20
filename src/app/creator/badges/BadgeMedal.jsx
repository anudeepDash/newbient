import React, { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import Rocket from 'lucide-react/dist/esm/icons/rocket';
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import IdCard from 'lucide-react/dist/esm/icons/id-card';
import Send from 'lucide-react/dist/esm/icons/send';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Clapperboard from 'lucide-react/dist/esm/icons/clapperboard';
import Film from 'lucide-react/dist/esm/icons/film';
import MicVocal from 'lucide-react/dist/esm/icons/mic-vocal';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Route from 'lucide-react/dist/esm/icons/route';
import Binoculars from 'lucide-react/dist/esm/icons/binoculars';
import Link from 'lucide-react/dist/esm/icons/link';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Handshake from 'lucide-react/dist/esm/icons/handshake';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Sprout from 'lucide-react/dist/esm/icons/sprout';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Crown from 'lucide-react/dist/esm/icons/crown';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Gem from 'lucide-react/dist/esm/icons/gem';
import Award from 'lucide-react/dist/esm/icons/award';
import { cn } from '../../../lib/utils';
import { BADGE_TIERS } from '../../../lib/creator/achievements';

/*
 * The badge artwork, drawn in SVG so it stays sharp at any size:
 *
 *   frame   the family's shape (coin, hexagon, shield, rosette, octagon)
 *           cast in the tier's metal (bronze, silver, gold, or prismatic
 *           foil for legend)
 *   field   the family's colour as a lit enamel dome, with a sunburst
 *   emblem  the badge's icon, embossed
 *   ribbon  a banner under the medal with one star per tier
 *
 * Earned badges get a gloss and a shine that sweeps across every few
 * seconds (none with reduced motion). Locked ones are an uncast grey blank,
 * secret ones show a question mark. `glare` ({ x, y } in 0–1) lights the
 * medal from a point, for the tilting large view.
 */

const EMBLEMS = {
    rocket: Rocket, 'badge-check': BadgeCheck, instagram: Instagram, 'id-card': IdCard, send: Send,
    'heart-handshake': HeartHandshake, ticket: Ticket, clapperboard: Clapperboard, film: Film,
    'mic-vocal': MicVocal, 'list-checks': ListChecks, route: Route, binoculars: Binoculars, link: Link,
    megaphone: Megaphone, handshake: Handshake, trophy: Trophy, sprout: Sprout, flame: Flame, zap: Zap,
    crown: Crown, sparkles: Sparkles, gem: Gem,
};

const METALS = {
    bronze: ['#ffd9b0', '#d08546', '#6b3210', '#eeac6c', '#7c3d14'],
    silver: ['#ffffff', '#cdd2da', '#626a78', '#f3f5f7', '#868e9a'],
    gold: ['#fff7c9', '#f5c33b', '#8c5b00', '#ffe68f', '#a87308'],
    legend: ['#ff7ad9', '#b07cff', '#6fa8ff', '#5ef0ff', '#7dff5c', '#fff36b', '#ff9d5c', '#ff7ad9'],
};

const ENAMEL = {
    debut: ['#7bff57', '#1f9a08', '#062f02'],
    campaigns: ['#7ff3ff', '#1279e0', '#05173f'],
    community: ['#ff9ad6', '#9333ea', '#1f0743'],
    reach: ['#ffe372', '#f4620f', '#4c1002'],
    special: ['#b9a6ff', '#4325a8', '#08061c'],
};

/* ── Geometry (viewBox 120 × 136, medal centred on 60,58) ─────────── */

const CX = 60;
const CY = 58;

const polygon = (n, r, rotDeg = -90) => Array.from({ length: n }, (_, i) => {
    const a = ((rotDeg + (360 / n) * i) * Math.PI) / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
});

const starPoints = (n, rOut, rIn, rotDeg = -90) => Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? rIn : rOut;
    const a = ((rotDeg + (180 / n) * i) * Math.PI) / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
});

/* A closed path through points with each corner rounded by `radius`. */
function rounded(points, radius) {
    const n = points.length;
    let d = '';
    for (let i = 0; i < n; i++) {
        const [px, py] = points[(i - 1 + n) % n];
        const [x, y] = points[i];
        const [nx, ny] = points[(i + 1) % n];
        const inLen = Math.hypot(x - px, y - py);
        const outLen = Math.hypot(nx - x, ny - y);
        const r = Math.min(radius, inLen / 2, outLen / 2);
        const a = [x + ((px - x) / inLen) * r, y + ((py - y) / inLen) * r];
        const b = [x + ((nx - x) / outLen) * r, y + ((ny - y) / outLen) * r];
        d += `${i ? 'L' : 'M'}${a[0].toFixed(2)} ${a[1].toFixed(2)}Q${x.toFixed(2)} ${y.toFixed(2)} ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
    }
    return `${d}Z`;
}

const circle = (r) => `M${CX - r} ${CY}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;

/* Shield outline, scaled about the medal centre. */
const shield = (s) => {
    const p = (x, y) => `${(CX + (x - CX) * s).toFixed(2)} ${(CY + (y - CY) * s).toFixed(2)}`;
    return `M${p(60, 2)}C${p(76, 12)} ${p(94, 15)} ${p(110, 16)}C${p(112, 62)} ${p(96, 94)} ${p(60, 115)}C${p(24, 94)} ${p(8, 62)} ${p(10, 16)}C${p(26, 15)} ${p(44, 12)} ${p(60, 2)}Z`;
};

/* Each family's shape: path at a scale (1 = outer frame, smaller = bevel and enamel). */
const SHAPES = {
    debut: (s) => circle(56 * s),
    campaigns: (s) => rounded(polygon(6, 60 * s), 9 * s),
    community: shield,
    reach: (s) => (s === 1 ? rounded(starPoints(16, 59, 52), 2.2) : circle(54 * s)),
    special: (s) => rounded(polygon(8, 59 * s, -67.5), 7 * s),
};

const INSET = { bevel: 0.87, field: 0.77 };

const RAYS = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const w = Math.PI / 36;
    const R = 70;
    return `M${CX} ${CY}L${CX + R * Math.cos(a - w)} ${CY + R * Math.sin(a - w)}L${CX + R * Math.cos(a + w)} ${CY + R * Math.sin(a + w)}Z`;
}).join('');

const RIBBON = 'M20 104h80l-4 9 4 9H20l4-9z';
const RIBBON_TAILS = 'M14 108h14v18l-7-4-7 4zM92 108h14v18l-7-4-7 4z';

const STAR = (cx, cy, r) => rounded(starPoints(5, r, r * 0.45).map(([x, y]) => [x - CX + cx, y - CY + cy]), 0.6);

/* ── The medal ───────────────────────────────────────────────────── */

const BadgeMedal = ({ badge, earned = badge?.earned, size = 72, compact = false, animate = true, glare = null, className, title }) => {
    const raw = useId();
    const reduced = useReducedMotion();
    if (!badge) return null;
    const id = (k) => `b${raw.replace(/[^a-zA-Z0-9]/g, '')}${k}`;
    const url = (k) => `url(#${id(k)})`;
    const shape = SHAPES[badge.family] || SHAPES.debut;
    const tier = BADGE_TIERS[badge.tier] || BADGE_TIERS.bronze;
    const metal = METALS[tier.id];
    const enamel = ENAMEL[badge.family] || ENAMEL.debut;
    const legend = tier.id === 'legend';
    const secret = badge.secret && !earned;
    const Emblem = EMBLEMS[badge.emblem] || Award;
    const moving = earned && animate && !reduced;
    const height = compact ? 120 : 136;
    const frame = shape(1);
    const field = shape(INSET.field);

    return (
        <svg
            viewBox={`0 0 120 ${height}`}
            width={size}
            height={(size * height) / 120}
            role="img"
            aria-label={title || (secret ? 'Secret badge' : badge.name)}
            className={cn('shrink-0 overflow-visible', earned && 'drop-shadow-[0_6px_10px_rgba(0,0,0,0.28)]', className)}
        >
            <defs>
                <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="1">
                    {metal.map((c, i) => <stop key={i} offset={i / (metal.length - 1)} stopColor={c} />)}
                    {legend && moving && <animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="9s" repeatCount="indefinite" />}
                </linearGradient>
                <linearGradient id={id('rim')} x1="0" y1="1" x2="1" y2="0">
                    {metal.map((c, i) => <stop key={i} offset={i / (metal.length - 1)} stopColor={c} />)}
                </linearGradient>
                <radialGradient id={id('enamel')} cx=".38" cy=".3" r=".85">
                    <stop offset="0" stopColor={enamel[0]} />
                    <stop offset=".5" stopColor={enamel[1]} />
                    <stop offset="1" stopColor={enamel[2]} />
                </radialGradient>
                <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity=".55" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={id('shine')} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#fff" stopOpacity="0" />
                    <stop offset=".5" stopColor="#fff" stopOpacity=".75" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                {glare && (
                    <radialGradient id={id('glare')} cx={glare.x} cy={glare.y} r=".6">
                        <stop offset="0" stopColor="#fff" stopOpacity=".7" />
                        <stop offset=".45" stopColor="#fff" stopOpacity=".12" />
                        <stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </radialGradient>
                )}
                {glare && legend && (
                    <linearGradient id={id('foil')} x1="0" y1="0" x2="1" y2="1" gradientTransform={`translate(${(glare.x - 0.5) * 0.8} ${(glare.y - 0.5) * 0.8})`} spreadMethod="reflect">
                        {METALS.legend.map((c, i) => <stop key={i} offset={i / (METALS.legend.length - 1)} stopColor={c} />)}
                    </linearGradient>
                )}
                <clipPath id={id('frameClip')}><path d={frame} /></clipPath>
                <clipPath id={id('fieldClip')}><path d={field} /></clipPath>
                <filter id={id('emboss')} x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="1.6" stdDeviation="1.2" floodColor="#000" floodOpacity=".45" />
                </filter>
            </defs>

            {earned ? (
                <>
                    {!compact && (
                        <g>
                            <path d={RIBBON_TAILS} fill={enamel[2]} />
                            <path d={RIBBON_TAILS} fill="#000" opacity=".25" />
                        </g>
                    )}
                    {/* Frame, bevel and enamel */}
                    <path d={frame} fill={url('metal')} />
                    <path d={frame} fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="1" />
                    <path d={shape(INSET.bevel)} fill={url('rim')} />
                    <path d={field} fill={url('enamel')} />
                    <g clipPath={url('fieldClip')}>
                        <path d={RAYS} fill="#fff" opacity=".09">
                            {moving && legend && <animateTransform attributeName="transform" type="rotate" values={`0 ${CX} ${CY};360 ${CX} ${CY}`} dur="24s" repeatCount="indefinite" />}
                        </path>
                        <ellipse cx={CX} cy={CY - 22} rx="46" ry="26" fill={url('gloss')} />
                    </g>
                    <path d={field} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="1.2" />

                    {/* Emblem */}
                    <g filter={url('emboss')}>
                        <Emblem x={CX - 23} y={CY - 23} width="46" height="46" color="#fff" strokeWidth={2.1} absoluteStrokeWidth={false} />
                    </g>

                    {/* Light: the sweep, the pointer glare and legend foil */}
                    {moving && (
                        <g clipPath={url('frameClip')}>
                            <g transform={`rotate(24 ${CX} ${CY})`}>
                                <rect x="-40" y="-30" width="26" height="200" fill={url('shine')}>
                                    <animateTransform attributeName="transform" type="translate" values="-30 0;190 0;190 0" keyTimes="0;.32;1" dur="5s" begin={`${(badge.id.length % 5) * 0.6}s`} repeatCount="indefinite" />
                                </rect>
                            </g>
                        </g>
                    )}
                    {glare && legend && <path d={frame} fill={url('foil')} opacity=".38" style={{ mixBlendMode: 'color-dodge' }} />}
                    {glare && <path d={frame} fill={url('glare')} style={{ mixBlendMode: 'overlay' }} />}

                    {!compact && (
                        <g>
                            <path d={RIBBON} fill={url('rim')} />
                            <path d={RIBBON} fill="none" stroke="#000" strokeOpacity=".3" strokeWidth=".8" />
                            {Array.from({ length: tier.rank }, (_, i) => {
                                const cx = CX + (i - (tier.rank - 1) / 2) * 11;
                                return <path key={i} d={STAR(cx, 113, 4.6)} fill={enamel[2]} opacity=".85" />;
                            })}
                        </g>
                    )}
                </>
            ) : (
                <g className="text-zinc-400 dark:text-zinc-600">
                    {!compact && <path d={RIBBON_TAILS} className="fill-zinc-300 dark:fill-zinc-800" />}
                    <path d={frame} className="fill-zinc-300 dark:fill-zinc-700/80" />
                    <path d={shape(INSET.bevel)} className="fill-zinc-200 dark:fill-zinc-800" />
                    <path d={field} className="fill-zinc-100 dark:fill-[#14161c]" />
                    <path d={field} fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1" strokeDasharray="2 3" />
                    {secret ? (
                        <text x={CX} y={CY + 13} textAnchor="middle" fontSize="40" fontWeight="900" fontFamily="Outfit, sans-serif" fill="currentColor">?</text>
                    ) : (
                        <Emblem x={CX - 21} y={CY - 21} width="42" height="42" color="currentColor" strokeWidth={1.8} />
                    )}
                    {!compact && (
                        <g>
                            <path d={RIBBON} className="fill-zinc-300 dark:fill-zinc-800" />
                            {Array.from({ length: tier.rank }, (_, i) => {
                                const cx = CX + (i - (tier.rank - 1) / 2) * 11;
                                return <path key={i} d={STAR(cx, 113, 4.6)} fill="currentColor" opacity=".6" />;
                            })}
                        </g>
                    )}
                </g>
            )}
        </svg>
    );
};

export default BadgeMedal;
