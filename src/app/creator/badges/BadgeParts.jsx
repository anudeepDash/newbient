import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Lock from 'lucide-react/dist/esm/icons/lock';
import { cn } from '../../../lib/utils';
import { BADGE_FAMILIES, BADGE_TIERS, byRarity } from '../../../lib/creator/achievements';
import { Sheet } from '../../../components/app';
import { appPath } from '../../host';
import { useT } from '../../../i18n';
import BadgeMedal from './BadgeMedal';

/* Pieces shared by the Badges tab, the header shelf and the unlock moment. */

export const FAMILY_GLOW = {
    debut: '57,255,20',
    campaigns: '0,180,255',
    community: '176,92,255',
    reach: '255,138,31',
    special: '139,123,255',
};

const TIER_CHIP = {
    bronze: 'bg-orange-500/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300',
    silver: 'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-300/10 dark:text-zinc-200',
    gold: 'bg-amber-400/15 text-amber-700 dark:bg-amber-300/10 dark:text-amber-300',
    legend: 'bg-gradient-to-r from-fuchsia-500/15 via-sky-400/15 to-lime-400/15 text-fuchsia-700 dark:text-fuchsia-200',
};

export const TierChip = ({ tier, className }) => {
    const t = useT();
    const meta = BADGE_TIERS[tier];
    if (!meta) return null;
    return <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-black uppercase tracking-wider', TIER_CHIP[tier], className)}>{t(meta.label)}</span>;
};

export const ProgressBar = ({ ratio, glow, className }) => (
    <span className={cn('block h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.08]', className)}>
        <span
            className="block h-full rounded-full transition-[width] duration-700"
            style={{ width: `${Math.round(Math.max(0.04, ratio) * 100)}%`, background: glow ? `rgb(${glow})` : undefined }}
        />
    </span>
);

const familyLabel = (id) => BADGE_FAMILIES.find(f => f.id === id)?.label || '';

/* ── A badge in the grid ──────────────────────────────────────────── */

export const BadgeTile = ({ badge, onOpen }) => {
    const t = useT();
    const secret = badge.secret && !badge.earned;
    const glow = FAMILY_GLOW[badge.family];
    return (
        <button
            type="button"
            onClick={() => onOpen(badge)}
            className={cn(
                'group relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl border px-2 pb-3.5 pt-4 text-center transition-all active:scale-[0.97]',
                badge.earned
                    ? 'border-black/[0.06] bg-white hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)] dark:border-white/[0.08] dark:bg-[#0c0e14]'
                    : 'border-dashed border-black/[0.1] bg-black/[0.015] dark:border-white/[0.08] dark:bg-white/[0.015]'
            )}
        >
            {badge.earned && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60 transition-opacity group-hover:opacity-100" style={{ background: `radial-gradient(60% 70% at 50% 0%, rgba(${glow},0.22), transparent)` }} />
            )}
            <BadgeMedal badge={badge} size={78} className="relative transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
            <span className="relative w-full space-y-1 px-1">
                <span className={cn('line-clamp-2 block break-words text-[13px] font-extrabold leading-tight', !badge.earned && 'text-gray-500 dark:text-zinc-400')}>
                    {secret ? t('Secret') : t(badge.name)}
                </span>
                {badge.earned ? (
                    <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">{t(BADGE_TIERS[badge.tier].label)}</span>
                ) : secret ? (
                    <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-zinc-500"><Lock size={10} /> {t('Hidden')}</span>
                ) : badge.target > 1 ? (
                    <span className="block space-y-1">
                        <ProgressBar ratio={badge.ratio} glow={glow} className="mx-auto w-14" />
                        <span className="block text-[11px] font-bold tabular-nums text-gray-400 dark:text-zinc-500">{badge.value.toLocaleString('en-IN')}/{badge.target.toLocaleString('en-IN')}</span>
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-zinc-500"><Lock size={10} /> {t('Locked')}</span>
                )}
            </span>
        </button>
    );
};

/* ── The large, tilting medal ─────────────────────────────────────── */

export const TiltMedal = ({ badge, size = 200 }) => {
    const reduced = useReducedMotion();
    const ref = useRef(null);
    const [p, setP] = useState({ x: 0.5, y: 0.35 });
    const [active, setActive] = useState(false);
    const move = (e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setP({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
        setActive(true);
    };
    const reset = () => { setActive(false); setP({ x: 0.5, y: 0.35 }); };
    const tilt = !reduced && badge.earned;
    return (
        <div
            ref={ref}
            onPointerMove={tilt ? move : undefined}
            onPointerLeave={tilt ? reset : undefined}
            onPointerUp={tilt ? reset : undefined}
            className="touch-pan-y select-none [perspective:700px]"
        >
            <motion.div
                animate={tilt ? { rotateX: (0.5 - p.y) * 26, rotateY: (p.x - 0.5) * 30, y: active ? 0 : [0, -6, 0] } : {}}
                transition={active ? { type: 'spring', stiffness: 260, damping: 20 } : { rotateX: { duration: 0.5 }, rotateY: { duration: 0.5 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                <BadgeMedal badge={badge} size={size} glare={badge.earned ? p : null} className={badge.earned ? 'drop-shadow-[0_22px_30px_rgba(0,0,0,0.45)]' : ''} />
            </motion.div>
        </div>
    );
};

/* A stage behind a big medal: dark, with the family's colour as a spotlight. */
export const Stage = ({ family, earned = true, className, children }) => {
    const glow = FAMILY_GLOW[family] || FAMILY_GLOW.debut;
    return (
        <div className={cn('relative isolate overflow-hidden bg-[#07080c]', className)}>
            <span aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: earned ? `radial-gradient(55% 60% at 50% 38%, rgba(${glow},0.42), transparent 70%), radial-gradient(40% 30% at 50% 100%, rgba(${glow},0.18), transparent)` : 'radial-gradient(50% 55% at 50% 40%, rgba(255,255,255,0.08), transparent 70%)' }} />
            <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(60%_60%_at_50%_45%,#000,transparent)]" />
            {children}
        </div>
    );
};

/* ── Badge detail ─────────────────────────────────────────────────── */

export const BadgeSheet = ({ badge: current, onClose }) => {
    const t = useT();
    const open = Boolean(current);
    // Keep the last badge while the sheet animates closed.
    const last = useRef(current);
    if (current) last.current = current;
    const badge = current || last.current;
    const secret = badge?.secret && !badge?.earned;
    return (
        <Sheet open={open} onClose={onClose} bleed width="sm" bodyClassName="p-0" backdrop={<div className="h-full bg-[#f7f7f3] dark:bg-[#0b0d12]" />}>
            {badge && (
                <div>
                    <Stage family={badge.family} earned={badge.earned} className="flex justify-center px-6 pb-6 pt-10">
                        <TiltMedal badge={badge} size={190} />
                    </Stage>
                    <div className="space-y-4 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 text-center">
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                                <TierChip tier={badge.tier} />
                                <span className="text-[12px] font-bold text-gray-500 dark:text-zinc-500">{t(familyLabel(badge.family))}</span>
                            </div>
                            <h2 className="font-heading text-[28px] font-extrabold leading-tight tracking-[-0.03em]">{secret ? t('Secret badge') : t(badge.name)}</h2>
                            <p className="mx-auto max-w-xs text-[15px] text-gray-600 dark:text-zinc-300">
                                {badge.earned ? t(badge.flavor) : secret ? t('Nobody knows how to get this one until they do. Keep creating.') : t(badge.how)}
                            </p>
                        </div>
                        {badge.earned ? (
                            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[13px] font-bold text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green">
                                <span className="h-1.5 w-1.5 rounded-full bg-current" /> {t('Collected')}
                            </p>
                        ) : !secret && (
                            <div className="mx-auto max-w-xs space-y-1.5 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                                <div className="flex justify-between text-[12px] font-bold text-gray-500 dark:text-zinc-400">
                                    <span>{t('Progress')}</span>
                                    <span className="tabular-nums">{badge.value.toLocaleString('en-IN')} / {badge.target.toLocaleString('en-IN')}</span>
                                </div>
                                <ProgressBar ratio={badge.ratio} glow={FAMILY_GLOW[badge.family]} className="h-2" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Sheet>
    );
};

/* ── The header shelf: your rarest few, linking to the tab ────────── */

/* Styled like the hero's stat tiles and as wide as their grid, so the hero's boxes line up. */
export const BadgeShelf = ({ badges, className }) => {
    const t = useT();
    const earned = badges.filter(b => b.earned).sort(byRarity);
    if (!earned.length) return null;
    const shown = earned.slice(0, 5);
    return (
        <Link
            to={appPath('/creator/badges')}
            className={cn(
                'group flex h-12 items-center gap-2.5 rounded-2xl border border-black/[0.05] bg-white/75 pl-2 pr-2.5 transition-colors hover:bg-white dark:border-white/[0.07] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]',
                className
            )}
            aria-label={t('{n} badges collected', { n: earned.length })}
        >
            <span className="flex -space-x-1.5">
                {shown.map((b, i) => (
                    <span key={b.id} className={cn('relative', i >= 3 && 'hidden sm:block')} style={{ zIndex: shown.length - i }}>
                        <BadgeMedal badge={b} size={28} compact animate={false} className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]" />
                    </span>
                ))}
            </span>
            <span className="flex flex-col">
                <span className="font-heading text-[17px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-gray-900 dark:text-white">{earned.length}</span>
                <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">{earned.length === 1 ? t('Badge') : t('Badges')}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" />
        </Link>
    );
};
