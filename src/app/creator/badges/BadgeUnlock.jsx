import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { byRarity } from '../../../lib/creator/achievements';
import { Button, Sheet } from '../../../components/app';
import { appPath } from '../../host';
import { useT } from '../../../i18n';
import BadgeMedal from './BadgeMedal';
import { Stage, TierChip } from './BadgeParts';
import { readSeen, writeSeen } from './useBadges';

/*
 * The unlock moment: when the creator has badges this device hasn't
 * celebrated yet, one sheet shows them all with confetti. It waits for the
 * badge list to settle (campaigns and referrals load one after another), so a
 * creator with several new badges gets one sheet, not a string of them.
 */

const SETTLE_MS = 1600;

const confetti = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    import('canvas-confetti').then(({ default: fire }) => {
        const colors = ['#39FF14', '#ffffff', '#f5c33b', '#b07cff', '#5ef0ff'];
        fire({ particleCount: 110, spread: 80, startVelocity: 42, origin: { y: 0.3 }, colors, zIndex: 1000 });
        setTimeout(() => fire({ particleCount: 60, spread: 120, origin: { y: 0.25 }, colors, zIndex: 1000 }), 260);
    }).catch(() => {});
};

const BadgeUnlock = ({ uid, badges, ready }) => {
    const t = useT();
    const reduced = useReducedMotion();
    const [fresh, setFresh] = useState([]);
    const earnedKey = badges.filter(b => b.earned).map(b => b.id).join(',');
    const latest = useRef(badges);
    latest.current = badges;

    useEffect(() => {
        if (!uid || !ready || !earnedKey) return undefined;
        const timer = setTimeout(() => {
            const seen = readSeen(uid) || new Set();
            const earned = latest.current.filter(b => b.earned);
            const unseen = earned.filter(b => !seen.has(b.id)).sort(byRarity);
            if (!unseen.length) return;
            writeSeen(uid, new Set([...seen, ...earned.map(b => b.id)]));
            setFresh(unseen);
        }, SETTLE_MS);
        return () => clearTimeout(timer);
    }, [uid, ready, earnedKey]);

    const open = fresh.length > 0;
    useEffect(() => { if (open) confetti(); }, [open]);

    const close = () => setFresh([]);
    // Keep showing the last batch while the sheet animates closed.
    const shown = useRef(fresh);
    if (fresh.length) shown.current = fresh;
    const lead = shown.current[0];
    const rest = shown.current.slice(1, 7);
    const total = shown.current.length;

    return (
        <Sheet open={open} onClose={close} bleed width="sm" bodyClassName="p-0" backdrop={<div className="h-full bg-[#f7f7f3] dark:bg-[#0b0d12]" />}>
            {lead && (
                <div>
                    <Stage family={lead.family} className="flex flex-col items-center gap-4 px-6 pb-6 pt-10 text-white">
                        <motion.p
                            initial={reduced ? false : { opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-neon-green"
                        >
                            {total === 1 ? t('Badge unlocked') : t('{n} badges unlocked', { n: total })}
                        </motion.p>
                        <motion.div
                            initial={reduced ? false : { scale: 0.2, rotate: -200, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 170, damping: 14, delay: 0.1 }}
                        >
                            <BadgeMedal badge={lead} size={176} className="drop-shadow-[0_22px_30px_rgba(0,0,0,0.5)]" />
                        </motion.div>
                        {rest.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {rest.map((b, i) => (
                                    <motion.span
                                        key={b.id}
                                        initial={reduced ? false : { scale: 0, y: 12 }}
                                        animate={{ scale: 1, y: 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.55 + i * 0.08 }}
                                    >
                                        <BadgeMedal badge={b} size={46} compact />
                                    </motion.span>
                                ))}
                                {total > 7 && <span className="self-center px-1 text-[13px] font-bold text-zinc-400">+{total - 7}</span>}
                            </div>
                        )}
                    </Stage>
                    <div className="space-y-4 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 text-center">
                        <div className="space-y-2">
                            <TierChip tier={lead.tier} />
                            <h2 className="font-heading text-[28px] font-extrabold leading-tight tracking-[-0.03em]">{t(lead.name)}</h2>
                            <p className="mx-auto max-w-xs text-[15px] text-gray-600 dark:text-zinc-300">{t(lead.flavor)}</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-center">
                            <Button to={appPath('/creator/badges')} onClick={close}>{t('See your badges')}</Button>
                            <Button variant="secondary" onClick={close}>{t('Nice')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </Sheet>
    );
};

export default BadgeUnlock;
