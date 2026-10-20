import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BADGE_FAMILIES, byRarity, nextBadge } from '../../../lib/creator/achievements';
import { useT } from '../../../i18n';
import BadgeMedal from './BadgeMedal';
import { BadgeSheet, BadgeTile, FAMILY_GLOW, ProgressBar, Stage } from './BadgeParts';

/*
 * /creator/badges: the trophy case (your rarest three on a stage, how many
 * you've collected and the one you're closest to), then every badge by
 * family. Tapping one opens it large, tilting under your finger.
 */

const TrophyCase = ({ badges, onOpen }) => {
    const t = useT();
    const reduced = useReducedMotion();
    const earned = badges.filter(b => b.earned).sort(byRarity);
    const top = earned.slice(0, 3);
    // Rarest in the middle, the next two either side.
    const podium = [top[1], top[0], top[2]].filter(Boolean);
    const next = nextBadge(badges);
    const total = badges.length;
    return (
        <Stage family={top[0]?.family || 'debut'} className="rounded-[2rem] text-white ring-1 ring-inset ring-white/[0.08]">
            <div className="space-y-6 px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.9)]" aria-hidden="true" />{t('Trophy case')}
                        </p>
                        <h2 className="mt-2 font-heading text-[26px] font-extrabold leading-none tracking-[-0.035em] sm:text-[32px]">
                            {earned.length} <span className="text-zinc-500">/ {total}</span>
                        </h2>
                        <p className="mt-1 text-[13px] font-semibold text-zinc-400">{t('badges collected')}</p>
                    </div>
                    <p className="max-w-[11rem] text-right text-[12px] leading-snug text-zinc-500">{t('Earn them by creating, delivering and growing on Newbi.')}</p>
                </div>

                <div className="flex items-end justify-center gap-1 sm:gap-4">
                    {podium.map((b, i) => {
                        const centre = b === top[0];
                        return (
                            <motion.button
                                key={b.id}
                                type="button"
                                onClick={() => onOpen(b)}
                                initial={reduced ? false : { opacity: 0, y: 24, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1, rotate: centre ? 0 : i === 0 ? -8 : 8 }}
                                transition={{ delay: 0.08 * i, type: 'spring', stiffness: 260, damping: 18 }}
                                className={centre ? 'relative z-10 -mb-1' : 'relative opacity-90'}
                                aria-label={t(b.name)}
                            >
                                <BadgeMedal badge={b} size={centre ? 128 : 88} />
                            </motion.button>
                        );
                    })}
                </div>

                <div className="space-y-2">
                    <ProgressBar ratio={earned.length / total} glow="57,255,20" className="h-2 bg-white/[0.08]" />
                </div>

                {next && (
                    <button
                        type="button"
                        onClick={() => onOpen(next)}
                        className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] p-3 text-left ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.09]"
                    >
                        <BadgeMedal badge={next} size={46} compact />
                        <span className="min-w-0 flex-1 space-y-1.5">
                            <span className="block text-[11px] font-black uppercase tracking-wider text-zinc-500">{t('Next up')}</span>
                            <span className="block truncate text-[15px] font-extrabold">{t(next.name)} <span className="font-semibold text-zinc-400">· {t(next.how)}</span></span>
                            {next.target > 1 && (
                                <span className="flex items-center gap-2">
                                    <ProgressBar ratio={next.ratio} glow={FAMILY_GLOW[next.family]} className="flex-1 bg-white/[0.08]" />
                                    <span className="text-[11px] font-bold tabular-nums text-zinc-400">{next.value.toLocaleString('en-IN')}/{next.target.toLocaleString('en-IN')}</span>
                                </span>
                            )}
                        </span>
                    </button>
                )}
            </div>
        </Stage>
    );
};

const BadgesTab = ({ badges }) => {
    const t = useT();
    const [open, setOpen] = useState(null);
    if (!badges.length) return null;
    return (
        <div className="space-y-8">
            <TrophyCase badges={badges} onOpen={setOpen} />
            {BADGE_FAMILIES.map(f => {
                const list = badges.filter(b => b.family === f.id);
                if (!list.length) return null;
                const got = list.filter(b => b.earned).length;
                return (
                    <section key={f.id} className="space-y-3">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <h3 className="font-heading text-[20px] font-extrabold tracking-[-0.03em]">{t(f.label)}</h3>
                                <p className="text-[13px] text-gray-500 dark:text-zinc-400">{t(f.blurb)}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-black tabular-nums text-gray-600 dark:bg-white/[0.06] dark:text-zinc-300">{got}/{list.length}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                            {list.map(b => <BadgeTile key={b.id} badge={b} onOpen={setOpen} />)}
                        </div>
                    </section>
                );
            })}
            <BadgeSheet badge={open} onClose={() => setOpen(null)} />
        </div>
    );
};

export default BadgesTab;
