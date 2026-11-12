import React, { useMemo, useRef, useState } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { Button } from '../../../components/app';
import { cn } from '../../../lib/utils';
import { useT } from '../../../i18n';

/*
 * The bonus wheel. The server picks the reward (api/_lib/community.js,
 * giveaway-spin) and says which segment it was; the wheel only lands on it.
 * Small wheels are drawn with their segments repeated, so a 3-segment wheel
 * still looks like a wheel.
 */

const FILLS = [
    { bg: '#39FF14', fg: '#000' },
    { bg: '#0b0d12', fg: '#fff' },
    { bg: '#FF4F8B', fg: '#fff' },
    { bg: '#f4f4f0', fg: '#000' },
    { bg: '#A855F7', fg: '#fff' },
    { bg: '#00F0FF', fg: '#000' },
];

const polar = (cx, cy, r, deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const slicePath = (i, n, r = 100) => {
    const a = 360 / n;
    const [x1, y1] = polar(100, 100, r, i * a);
    const [x2, y2] = polar(100, 100, r, (i + 1) * a);
    return `M100,100 L${x1},${y1} A${r},${r} 0 ${a > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
};

/* The drawn slices: each one points back at its segment. */
export const visualSlices = (wheel) => {
    if (!wheel.length) return [];
    const repeat = Math.max(1, Math.ceil(6 / wheel.length));
    return Array.from({ length: wheel.length * repeat }, (_, i) => ({ segment: i % wheel.length, ...wheel[i % wheel.length] }));
};

/* Where to stop so slice `i` of `n` sits under the pointer, at least `turns` full turns from `from`. */
export const landingAngle = (from, i, n, turns = 6, jitter = 0) => {
    const a = 360 / n;
    const want = (((-(i + 0.5) * a + jitter * a * 0.35) % 360) + 360) % 360;
    const base = from + turns * 360;
    return base + ((want - (base % 360)) + 360) % 360;
};

const SpinWheel = ({ wheel = [], spinsLeft = 0, history = [], onSpin, disabled }) => {
    const t = useT();
    const slices = useMemo(() => visualSlices(wheel), [wheel]);
    const [angle, setAngle] = useState(0);
    const [phase, setPhase] = useState('idle'); // idle | waiting | landing
    const [result, setResult] = useState(null);
    const pending = useRef(null);

    const spin = async () => {
        if (phase !== 'idle' || !spinsLeft) return;
        setResult(null);
        setPhase('waiting');
        const res = await onSpin();
        if (!res) { setPhase('idle'); return; }
        const matches = slices.map((s, i) => (s.segment === res.reward.index ? i : -1)).filter(i => i >= 0);
        const target = matches[Math.floor(Math.random() * matches.length)] ?? 0;
        pending.current = res;
        setPhase('landing');
        setAngle(a => landingAngle(a, target, slices.length, 6, Math.random() * 2 - 1));
    };

    const landed = () => {
        if (phase !== 'landing') return;
        setPhase('idle');
        const res = pending.current;
        pending.current = null;
        if (res) {
            setResult(res.reward);
            res.onLanded?.();
        }
    };

    const n = slices.length;
    return (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
            <div className="relative h-[232px] w-[232px] shrink-0">
                {/* glow + rim */}
                <div className="absolute -inset-3 rounded-full bg-[conic-gradient(from_0deg,#39FF14,#00F0FF,#A855F7,#FF4F8B,#39FF14)] opacity-40 blur-xl" aria-hidden="true" />
                <div className="absolute inset-0 rounded-full bg-black p-[7px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] ring-2 ring-white/10">
                    <svg
                        viewBox="0 0 200 200"
                        className={cn('h-full w-full', phase === 'waiting' && 'animate-[spin_0.6s_linear_infinite]')}
                        style={phase === 'waiting' ? undefined : { transform: `rotate(${angle}deg)`, transition: phase === 'landing' ? 'transform 4.2s cubic-bezier(0.12, 0.7, 0.1, 1)' : 'none' }}
                        onTransitionEnd={landed}
                        role="img"
                        aria-label={t('Bonus wheel: {options}', { options: wheel.map(w => w.label).join(', ') })}
                    >
                        {slices.map((s, i) => {
                            const fill = FILLS[s.segment % FILLS.length];
                            const mid = (i + 0.5) * (360 / n);
                            const [tx, ty] = polar(100, 100, 64, mid);
                            return (
                                <g key={i}>
                                    <path d={slicePath(i, n)} fill={fill.bg} stroke="#000" strokeWidth="1" />
                                    <text x={tx} y={ty} fill={fill.fg} fontSize={n > 8 ? 9 : 11} fontWeight="900" fontFamily="Outfit, sans-serif" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${tx} ${ty})`}>
                                        {String(s.label).replace(/ points?$/i, '')}
                                    </text>
                                </g>
                            );
                        })}
                        {Array.from({ length: n }, (_, i) => {
                            const [x, y] = polar(100, 100, 95, i * (360 / n));
                            return <circle key={`d${i}`} cx={x} cy={y} r="2" fill="#fff" opacity="0.8" />;
                        })}
                    </svg>
                </div>
                {/* hub */}
                <button
                    type="button"
                    onClick={spin}
                    disabled={disabled || !spinsLeft || phase !== 'idle'}
                    className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-black bg-neon-green font-heading text-[13px] font-black uppercase tracking-wider text-black shadow-[0_0_0_4px_rgba(255,255,255,0.15),0_6px_16px_rgba(0,0,0,0.45)] transition-transform active:scale-95 disabled:cursor-default disabled:opacity-100"
                    aria-label={t('Spin')}
                >
                    {phase === 'idle' ? t('Spin') : '…'}
                </button>
                {/* pointer */}
                <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2" aria-hidden="true">
                    <div className="h-0 w-0 border-x-[11px] border-t-[20px] border-x-transparent border-t-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]" />
                </div>
            </div>

            <div className="w-full min-w-0 flex-1 space-y-3 text-center sm:text-left">
                <div aria-live="polite">
                    {result ? (
                        <>
                            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">{t('You won')}</p>
                            <p className="font-heading text-[34px] font-black leading-none text-emerald-600 dark:text-neon-green">{result.label}</p>
                        </>
                    ) : (
                        <>
                            <p className="font-heading text-[20px] font-extrabold leading-tight">{spinsLeft > 0 ? (spinsLeft === 1 ? t('1 spin ready') : t('{count} spins ready', { count: spinsLeft })) : t('No spins left')}</p>
                            <p className="mt-1 text-[13px] text-gray-500 dark:text-zinc-400">{t('Every spin wins: {options}', { options: wheel.map(w => w.label).join(' · ') })}</p>
                        </>
                    )}
                </div>
                {spinsLeft > 0 && (
                    <Button className="w-full sm:w-auto" icon={Sparkles} onClick={spin} loading={phase === 'waiting'} disabled={disabled || phase !== 'idle'}>
                        {result ? t('Spin again') : t('Spin the wheel')}
                    </Button>
                )}
                {history.length > 1 && (
                    <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                        {history.map((h, i) => (
                            <span key={i} className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[12px] font-bold dark:bg-white/[0.08]">{h.label || t('Spin {n}', { n: i + 1 })}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpinWheel;
