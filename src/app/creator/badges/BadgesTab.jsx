import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import UserPen from 'lucide-react/dist/esm/icons/user-pen';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Loader2 from 'lucide-react/dist/esm/icons/loader-circle';
import { BADGE_FAMILIES, byRarity, nextBadge } from '../../../lib/creator/achievements';
import { appPath } from '../../host';
import { useT } from '../../../i18n';
import { Notice } from '../ui';
import { useInstagramConnect } from '../useInstagramConnect';
import BadgeMedal from './BadgeMedal';
import { BadgeSheet, BadgeTile, FAMILY_GLOW, ProgressBar, Stage } from './BadgeParts';

/*
 * /creator/badges: the trophy case (your rarest three on a stage, how many
 * you've collected and the one you're closest to), then every badge by
 * family. Tapping one opens it large, tilting under your finger. A locked
 * badge carries a button straight to its task: the details sheet, connecting
 * Instagram (from right here, coming back to this page), campaigns,
 * deliverables or referrals.
 */

const DETAIL_LABEL = { niche: 'Add your niche', city: 'Add your city', rates: 'Add your rates' };

/* The button for a locked badge's task ({ label, icon, onClick, loading }), or null. */
function useBadgeActions({ badges, ig, onGo }) {
    const navigate = useNavigate();
    const go = (path) => { onGo?.(); navigate(appPath(path)); };
    const applied = badges.some(b => b.id === 'first_pitch' && b.earned);
    return (badge) => {
        switch (badge.todo) {
            case 'details': {
                const missing = (badge.steps || []).filter(s => !s.done);
                const label = missing.length === 1 ? DETAIL_LABEL[missing[0].id] : 'Complete your details';
                return { label, icon: UserPen, onClick: () => go('/creator/profile?edit=details') };
            }
            case 'instagram':
                // Reach badges count followers from Instagram, so connecting is the step.
                return ig.available ? { label: badge.family === 'reach' ? 'Connect Instagram to count followers' : 'Connect Instagram', icon: Instagram, onClick: ig.connect, loading: ig.busy } : null;
            case 'openings':
                return { label: 'Browse campaigns', icon: Megaphone, onClick: () => go('/creator') };
            case 'deliverables':
                // Nothing to deliver before the first application: start there.
                return applied
                    ? { label: 'Open deliverables', icon: ListChecks, onClick: () => go('/creator/deliverables') }
                    : { label: 'Browse campaigns', icon: Megaphone, onClick: () => go('/creator') };
            case 'referrals':
                return { label: 'Invite creators', icon: UserPlus, onClick: () => go('/creator/referrals') };
            default:
                return null;
        }
    };
}

const TrophyCase = ({ badges, onOpen, actionFor }) => {
    const t = useT();
    const reduced = useReducedMotion();
    const earned = badges.filter(b => b.earned).sort(byRarity);
    const top = earned.slice(0, 3);
    // Rarest in the middle, the next two either side.
    const podium = [top[1], top[0], top[2]].filter(Boolean);
    const next = nextBadge(badges);
    const nextAction = next ? actionFor(next) : null;
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
                    <div className="rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]">
                        <button
                            type="button"
                            onClick={() => onOpen(next)}
                            className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-white/[0.03]"
                        >
                            <BadgeMedal badge={next} size={46} compact />
                            <span className="min-w-0 flex-1 space-y-1.5">
                                <span className="block text-[11px] font-black uppercase tracking-wider text-zinc-500">{t('Next up')}</span>
                                <span className="block text-[15px] font-extrabold leading-snug">{t(next.name)} <span className="font-semibold text-zinc-400">· {t(next.how)}</span></span>
                                {next.target > 1 && (
                                    <span className="flex items-center gap-2">
                                        <ProgressBar ratio={next.ratio} glow={FAMILY_GLOW[next.family]} className="flex-1 bg-white/[0.08]" />
                                        <span className="text-[11px] font-bold tabular-nums text-zinc-400">{next.value.toLocaleString('en-IN')}/{next.target.toLocaleString('en-IN')}</span>
                                    </span>
                                )}
                            </span>
                        </button>
                        {nextAction && (
                            <div className="px-3 pb-3">
                                <button
                                    type="button"
                                    onClick={nextAction.onClick}
                                    disabled={nextAction.loading}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neon-green text-[14px] font-extrabold text-black shadow-[0_0_18px_rgba(57,255,20,0.25)] transition-transform active:scale-[0.98] disabled:opacity-70"
                                >
                                    {nextAction.loading ? <Loader2 size={16} className="animate-spin" /> : <nextAction.icon size={16} strokeWidth={2.4} />}
                                    {t(nextAction.label)}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Stage>
    );
};

const BadgesTab = ({ badges, creator, settings }) => {
    const t = useT();
    const [open, setOpen] = useState(null);
    const ig = useInstagramConnect({ creator, settings, returnPath: '/creator/badges' });
    const actionFor = useBadgeActions({ badges, ig, onGo: () => setOpen(null) });
    if (!badges.length) return null;
    return (
        <div className="space-y-8">
            {ig.message && <Notice tone={ig.message.tone}>{ig.message.text}</Notice>}
            <TrophyCase badges={badges} onOpen={setOpen} actionFor={actionFor} />
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
            <BadgeSheet badge={open} onClose={() => setOpen(null)} actionFor={actionFor} />
        </div>
    );
};

export default BadgesTab;
