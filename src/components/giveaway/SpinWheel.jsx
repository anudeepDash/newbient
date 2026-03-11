import React, { useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const REWARDS = [
    { id: 'points_1', label: '+1 POINT', color: '#18181b', textColor: '#a1a1aa', probability: 0.4, points: 1 },
    { id: 'points_2', label: '+2 POINTS', color: '#1d4ed8', textColor: '#ffffff', probability: 0.3, points: 2 },
    { id: 'points_5', label: '+5 POINTS', color: '#7c3aed', textColor: '#ffffff', probability: 0.3, points: 5 },
];

const WheelSVG = ({ rewards, rotation }) => {
    const size = 400;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 8;
    const n = rewards.length;
    const angle = 360 / n;

    const polarToCartesian = (cx, cy, r, angleDeg) => {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };

    const describeSlice = (i) => {
        const startAngle = i * angle;
        const endAngle = (i + 1) * angle;
        const start = polarToCartesian(cx, cy, r, startAngle);
        const end = polarToCartesian(cx, cy, r, endAngle);
        const largeArc = angle > 180 ? 1 : 0;
        return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    };

    const textRadius = r * 0.62;

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ transform: `rotate(${rotation}deg)`, filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.8))' }}>
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* Outer ring */}
            <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />

            {/* Slices */}
            {rewards.map((reward, i) => {
                const midAngle = i * angle + angle / 2;
                const textX = cx + textRadius * Math.cos(((midAngle - 90) * Math.PI) / 180);
                const textY = cy + textRadius * Math.sin(((midAngle - 90) * Math.PI) / 180);

                return (
                    <g key={i}>
                        <path
                            d={describeSlice(i)}
                            fill={reward.color}
                            stroke="rgba(0,0,0,0.4)"
                            strokeWidth="2"
                        />
                        {/* Subtle inner radial gradient */}
                        <path
                            d={describeSlice(i)}
                            fill="url(#radial)"
                            opacity="0.15"
                        />
                        <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${midAngle}, ${textX}, ${textY})`}
                            fill={reward.textColor}
                            fontSize="15"
                            fontWeight="900"
                            fontFamily="system-ui, sans-serif"
                            letterSpacing="1.5"
                            style={{ textTransform: 'uppercase' }}
                        >
                            {reward.label}
                        </text>
                    </g>
                );
            })}

            {/* Divider lines */}
            {rewards.map((_, i) => {
                const pt = polarToCartesian(cx, cy, r, i * angle);
                return <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="rgba(0,0,0,0.5)" strokeWidth="2" />;
            })}

            {/* Center circle */}
            <circle cx={cx} cy={cy} r={40} fill="#0a0a0a" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle cx={cx} cy={cy} r={28} fill="url(#centerGrad)" />

            <defs>
                <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </radialGradient>
                <radialGradient id="radial" cx="100%" cy="100%" r="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
            </defs>
        </svg>
    );
};

const SpinWheel = ({ onResult, alreadySpun, giveawayEndDate }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState(null);
    const [rotation, setRotation] = useState(0);

    const availableRewards = REWARDS;

    const spin = async () => {
        if (isSpinning || alreadySpun) return;
        setIsSpinning(true);
        setResult(null);

        const n = availableRewards.length;
        const segAngle = 360 / n;

        // Probability-based selection
        const rand = Math.random();
        let cum = 0;
        let selectedIndex = 0;
        for (let i = 0; i < n; i++) {
            cum += availableRewards[i].probability;
            if (rand <= cum) { selectedIndex = i; break; }
        }

        const totalSpins = (7 + Math.floor(Math.random() * 5)) * 360;
        // We want the wheel's slice center at 0deg (top/pointer)
        // Pointer is at top. Slice i center is at i*segAngle + segAngle/2 from start
        const sliceCenter = selectedIndex * segAngle + segAngle / 2;
        const targetRotation = rotation - (totalSpins + sliceCenter - (rotation % 360));

        // Animate via CSS transition on the SVG
        const el = document.getElementById('spin-wheel-svg');
        if (el) {
            el.style.transition = 'transform 6s cubic-bezier(0.12,0,0.1,1)';
            el.style.transform = `rotate(${targetRotation}deg)`;
        }

        setRotation(targetRotation);

        setTimeout(() => {
            const won = availableRewards[selectedIndex];
            setResult(won);
            setIsSpinning(false);
            if (el) el.style.transition = '';
            onResult(won);
        }, 6200);
    };

    return (
        <div className="flex flex-col items-center gap-10">
            <div className="relative">
                {/* Outer glow */}
                <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-3xl scale-110 pointer-events-none animate-pulse" />

                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 z-30 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-white filter drop-shadow-lg" />
                </div>

                {/* Wheel */}
                <div
                    id="spin-wheel-svg"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className="w-[min(340px,80vw)] h-[min(340px,80vw)] md:w-[420px] md:h-[420px] rounded-full overflow-hidden"
                >
                    <WheelSVG rewards={availableRewards} rotation={0} />
                </div>
            </div>

            <Button
                onClick={spin}
                disabled={isSpinning || alreadySpun}
                className={cn(
                    "h-16 px-16 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl font-heading",
                    alreadySpun
                        ? "bg-zinc-800 text-gray-500 cursor-not-allowed border border-white/5"
                        : isSpinning
                            ? "bg-purple-600/50 text-white cursor-wait"
                            : "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                )}
            >
                {isSpinning ? 'SPINNING...' : alreadySpun ? 'SPUN ALREADY' : 'SPIN TO WIN'}
            </Button>

<AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl"
                        onClick={() => setResult(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', damping: 18, stiffness: 250 }}
                            className="relative mx-4 w-full max-w-md p-10 bg-zinc-900/90 border border-white/10 rounded-[2.5rem] backdrop-blur-3xl text-center overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.25)]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/15 to-neon-blue/10" />
                            {/* Decorative glow ring */}
                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
                            <div className="relative z-10 space-y-5">
                                <div className="w-20 h-20 mx-auto rounded-[1.5rem] flex items-center justify-center text-4xl"
                                    style={{ background: result.color, color: result.textColor, boxShadow: `0 0 40px ${result.color}66` }}>
                                    {'🎉'}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] mb-2">You Won</p>
                                    <h3 className="text-5xl font-black font-heading text-white uppercase italic tracking-tighter leading-none">{result.label}</h3>
                                </div>
                                <button
                                    onClick={() => setResult(null)}
                                    className="mt-2 px-8 py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
                                >
                                    AWESOME, CLOSE
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SpinWheel;
