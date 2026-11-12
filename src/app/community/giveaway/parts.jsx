import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Crown from 'lucide-react/dist/esm/icons/crown';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Check from 'lucide-react/dist/esm/icons/check';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Send from 'lucide-react/dist/esm/icons/send';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Music from 'lucide-react/dist/esm/icons/music';
import Ghost from 'lucide-react/dist/esm/icons/ghost';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Brain from 'lucide-react/dist/esm/icons/brain';
import KeyRound from 'lucide-react/dist/esm/icons/key-round';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Users from 'lucide-react/dist/esm/icons/users';
import Zap from 'lucide-react/dist/esm/icons/zap';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import { Button } from '../../../components/app';
import { cn } from '../../../lib/utils';
import { useT } from '../../../i18n';
import { ROW } from '../../pages/DetailLayout';

/* ---------------- shared bits ---------------- */

export const TASK_LOOK = {
    instagram: { icon: Instagram, bg: 'bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]', fg: 'text-white' },
    instagram_like_comment: { icon: Instagram, bg: 'bg-gradient-to-br from-[#fa7e1e] via-[#d62976] to-[#962fbf]', fg: 'text-white' },
    youtube: { icon: Youtube, bg: 'bg-[#ff0033]', fg: 'text-white' },
    telegram: { icon: Send, bg: 'bg-[#229ED9]', fg: 'text-white' },
    twitter: { icon: Twitter, bg: 'bg-black dark:bg-white', fg: 'text-white dark:text-black' },
    discord: { icon: MessageCircle, bg: 'bg-[#5865F2]', fg: 'text-white' },
    spotify: { icon: Music, bg: 'bg-[#1DB954]', fg: 'text-black' },
    snapchat: { icon: Ghost, bg: 'bg-[#FFFC00]', fg: 'text-black' },
    website: { icon: Globe, bg: 'bg-[#00F0FF]', fg: 'text-black' },
    quiz: { icon: Brain, bg: 'bg-[#A855F7]', fg: 'text-white' },
    code: { icon: KeyRound, bg: 'bg-[#FF4F8B]', fg: 'text-white' },
    custom: { icon: Sparkles, bg: 'bg-neon-green', fg: 'text-black' },
};
export const lookOf = (type) => TASK_LOOK[type] || TASK_LOOK.custom;

export const PointsPill = ({ points, done, className }) => (
    <span className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 font-heading text-[12px] font-black tabular-nums',
        done ? 'bg-emerald-500/15 text-emerald-700 dark:text-neon-green' : 'bg-black text-neon-green dark:bg-neon-green dark:text-black',
        className
    )}>
        +{points}
    </span>
);

/* A number that counts up to its new value. */
export const CountUp = ({ value = 0, className }) => {
    const reduce = useReducedMotion();
    const [shown, setShown] = useState(value);
    const from = useRef(value);
    useEffect(() => {
        if (reduce || from.current === value) { setShown(value); from.current = value; return undefined; }
        const start = performance.now();
        const a = from.current;
        let raf;
        const step = (now) => {
            const k = Math.min(1, (now - start) / 700);
            setShown(Math.round(a + (value - a) * (1 - (1 - k) ** 3)));
            if (k < 1) raf = requestAnimationFrame(step); else from.current = value;
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [value, reduce]);
    return <span className={cn('tabular-nums', className)}>{shown}</span>;
};

export const fireConfetti = (big = false) => {
    import('canvas-confetti').then(({ default: fire }) => {
        const colors = ['#39FF14', '#FF4F8B', '#00F0FF', '#A855F7', '#ffffff', '#facc15'];
        fire({ particleCount: big ? 160 : 70, spread: big ? 100 : 65, startVelocity: big ? 48 : 38, origin: { y: 0.35 }, colors, disableForReducedMotion: true });
        if (big) setTimeout(() => fire({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors, disableForReducedMotion: true }), 200);
        if (big) setTimeout(() => fire({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors, disableForReducedMotion: true }), 350);
    }).catch(() => {});
};

/* ---------------- countdown ---------------- */

export const useNow = (ms = 1000) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(id);
    }, [ms]);
    return now;
};

const split = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

const Tile = ({ value, label }) => (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-2xl bg-white/[0.06] py-2.5 ring-1 ring-inset ring-white/10">
        <span className="font-heading text-[28px] font-black leading-none tabular-nums text-white sm:text-[32px]">{String(value).padStart(2, '0')}</span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">{label}</span>
    </div>
);

/* ---------------- the prize vault (always dark, like a stage) ---------------- */

export const PrizeVault = ({ g, board, now }) => {
    const t = useT();
    const end = g.endsAt ? new Date(g.endsAt).getTime() : null;
    const left = end ? end - now : null;
    const live = !g.ended && (left === null || left > 0);
    const c = split(left || 0);
    const urgent = live && left !== null && left < 6 * 3600 * 1000;
    const glow = g.ambientColor || '#39FF14';
    return (
        <div className="relative overflow-hidden rounded-[28px] bg-[#07090d] p-5 text-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl" style={{ background: glow }} aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-neon-pink/25 blur-3xl" aria-hidden="true" />
            <div className="relative">
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-white/60"><Trophy size={13} className="text-neon-green" /> {t('Up for grabs')}</span>
                    {live ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-neon-green/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-neon-green">
                            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-neon-green" /></span>
                            {t('Live')}
                        </span>
                    ) : (
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-white/70">{t('Closed')}</span>
                    )}
                </div>
                <p className="mt-3 bg-gradient-to-r from-white via-white to-neon-green bg-clip-text font-heading text-[38px] font-black leading-[0.95] tracking-[-0.03em] text-transparent sm:text-[46px]">{g.prize || t('A surprise')}</p>
                {g.winnerCount > 1 && <p className="mt-1.5 text-[13px] font-semibold text-white/60">{t('{count} winners', { count: g.winnerCount })}</p>}

                {end && live && (
                    <div className="mt-5">
                        <p className={cn('mb-2 text-[11px] font-bold uppercase tracking-[0.2em]', urgent ? 'text-neon-pink' : 'text-white/50')}>{urgent ? t('Closing soon') : t('Entries close in')}</p>
                        <div className="flex gap-2">
                            {c.d > 0 && <Tile value={c.d} label={t('days')} />}
                            <Tile value={c.h} label={t('hrs')} />
                            <Tile value={c.m} label={t('min')} />
                            <Tile value={c.s} label={t('sec')} />
                        </div>
                    </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold text-white/70">
                    {board?.totalEntries > 0 && <span className="flex items-center gap-1.5"><Users size={14} className="text-neon-blue" /> <CountUp value={board.totalEntries} className="font-black text-white" /> {board.totalEntries === 1 ? t('entry') : t('entries')}</span>}
                    {live && board?.joinedLastHour > 0 && <span className="flex items-center gap-1.5"><Zap size={14} className="text-yellow-300" /> {t('{count} joined in the last hour', { count: board.joinedLastHour })}</span>}
                    {!live && g.winnersOn && <span>{t('Winners announced {date}', { date: new Date(`${g.winnersOn}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) })}</span>}
                </div>
            </div>
        </div>
    );
};

/* ---------------- how it works (before entering) ---------------- */

export const HowItWorks = ({ maxPoints }) => {
    const t = useT();
    const steps = [
        { n: 1, title: t('Enter free'), body: t('One tap with your Newbi account. That’s your first point.') },
        { n: 2, title: t('Stack points'), body: maxPoints > 1 ? t('Quests, spins and friends add up to {points}+ points.', { points: maxPoints }) : t('Invite friends and spin for more points.') },
        { n: 3, title: t('Win the draw'), body: t('Every point is a ticket in a fair random draw.') },
    ];
    return (
        <ol className={cn('grid gap-3 p-4 sm:grid-cols-3 sm:gap-4', ROW)} aria-label={t('How it works')}>
            {steps.map(s => (
                <li key={s.n} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black font-heading text-[14px] font-black text-neon-green dark:bg-neon-green dark:text-black">{s.n}</span>
                    <div className="min-w-0">
                        <p className="font-heading text-[15px] font-extrabold leading-tight">{s.title}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-gray-500 dark:text-zinc-400">{s.body}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
};

/* ---------------- your entry pass ---------------- */

const OddsRing = ({ chance }) => {
    const pct = Math.max(0, Math.min(1, chance || 0));
    const r = 34;
    const c = 2 * Math.PI * r;
    const label = pct >= 0.995 ? '99%' : pct >= 0.1 ? `${Math.round(pct * 100)}%` : pct >= 0.001 ? `${(pct * 100).toFixed(1)}%` : pct > 0 ? '<0.1%' : '–';
    return (
        <div className="relative h-[84px] w-[84px] shrink-0">
            <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
                <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                <circle cx="42" cy="42" r={r} fill="none" stroke="#39FF14" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(pct, 0.02))} style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading text-[17px] font-black leading-none text-white">{label}</span>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50">odds</span>
            </div>
        </div>
    );
};

export const EntryPass = ({ me, name, chance, burst }) => {
    const t = useT();
    return (
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0d1a0a] via-[#07090d] to-[#1a0a12] p-5 text-white ring-1 ring-neon-green/30 sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(57,255,20,0.18),transparent_55%)]" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-neon-green"><CircleCheck size={13} /> {me.isWinner ? t('Winner') : t('You’re in')}</p>
                    <p className="mt-1 truncate font-heading text-[19px] font-extrabold">{name}</p>
                    <div className="mt-3 flex items-end gap-5">
                        <div className="relative">
                            <p className="font-heading text-[44px] font-black leading-none text-white"><CountUp value={me.entryScore} /></p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t('points')}</p>
                            <AnimatePresence>
                                {burst && (
                                    <motion.span
                                        key={burst.key}
                                        initial={{ opacity: 0, y: 6, scale: 0.8 }}
                                        animate={{ opacity: 1, y: -20, scale: 1 }}
                                        exit={{ opacity: 0, y: -36 }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute -right-10 top-0 rounded-full bg-neon-green px-2 py-0.5 font-heading text-[14px] font-black text-black shadow-[0_0_20px_rgba(57,255,20,0.6)]"
                                    >
                                        +{burst.points}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                        {me.rank && (
                            <div>
                                <p className="font-heading text-[28px] font-black leading-none text-white/90">#{me.rank}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t('rank')}</p>
                            </div>
                        )}
                        {me.streak > 1 && (
                            <div>
                                <p className="flex items-center gap-1 font-heading text-[28px] font-black leading-none text-orange-300"><Flame size={20} />{me.streak}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t('streak')}</p>
                            </div>
                        )}
                    </div>
                </div>
                {chance !== null && <OddsRing chance={chance} />}
            </div>
            <div className="relative mt-4 border-t border-dashed border-white/15 pt-3 text-[12px] font-medium text-white/55">
                {t('Every point is one ticket in the draw. Keep stacking.')}
            </div>
        </div>
    );
};

/* ---------------- quests ---------------- */

export const QuestRow = ({ task, done, failed, triesLeft, busy, locked, onGo }) => {
    const t = useT();
    const look = lookOf(task.type);
    const Icon = look.icon;
    const verb = task.type === 'quiz' ? t('Answer') : task.type === 'code' ? t('Unlock') : task.url ? t('Go') : t('Mark done');
    return (
        <li className={cn('flex items-center gap-3 px-3.5 py-3 transition-colors', ROW, done && 'bg-emerald-500/[0.06] ring-emerald-500/25 dark:bg-neon-green/[0.05] dark:ring-neon-green/20')}>
            <span className={cn('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', look.bg, look.fg, (locked || failed) && 'opacity-50 grayscale')}>
                <Icon size={19} />
                {done && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white dark:border-[#0b0d12]"><Check size={11} strokeWidth={4} /></span>}
            </span>
            <div className="min-w-0 flex-1">
                <p className={cn('text-[15px] font-semibold leading-snug', done && 'text-gray-500 dark:text-zinc-400')}>{task.label}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-zinc-500">
                    <PointsPill points={task.points} done={done} />
                    {task.type === 'quiz' && !done && !failed && <span>{t('One try')}</span>}
                    {task.type === 'code' && !done && triesLeft < 5 && <span>{t('{count} tries left', { count: triesLeft })}</span>}
                    {failed && <span>{t('Missed this one')}</span>}
                </p>
            </div>
            {locked ? <Lock size={16} className="shrink-0 text-gray-400" />
                : done ? <span className="shrink-0 text-[13px] font-bold text-emerald-700 dark:text-neon-green">{t('Done')}</span>
                    : failed ? null
                        : <Button size="sm" variant={task.type === 'quiz' || task.type === 'code' ? 'primary' : 'secondary'} icon={task.url && !['quiz', 'code'].includes(task.type) ? ExternalLink : undefined} loading={busy} onClick={() => onGo(task)} className="shrink-0">{verb}</Button>}
        </li>
    );
};

export const QuestProgress = ({ done, total, earned, possible }) => {
    const t = useT();
    const pct = total ? Math.round((done / total) * 100) : 0;
    return (
        <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between text-[12px] font-bold text-gray-500 dark:text-zinc-400">
                <span>{t('{done} of {total} done', { done, total })}</span>
                <span className="tabular-nums">{t('{earned}/{possible} pts', { earned, possible })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-neon-green transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

/* ---------------- daily bonus ---------------- */

const addDays = (day, n) => {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

export const DailyBonus = ({ g, me, busy, onClaim }) => {
    const t = useT();
    const today = g.today;
    const claimed = me.checkins.includes(today);
    const lastDay = g.endsAt ? new Date(new Date(g.endsAt).getTime() + 330 * 60000).toISOString().slice(0, 10) : null;
    // A week around today: up to 3 days back, the rest ahead (never past the last day).
    let first = addDays(today, -3);
    const joined = String(me.createdAt || '').slice(0, 10);
    if (joined && joined > first) first = joined <= today ? joined : today;
    const days = [];
    for (let d = first; days.length < 7; d = addDays(d, 1)) {
        if (lastDay && d > lastDay) break;
        days.push(d);
    }
    const tomorrow = addDays(today, 1);
    const moreDays = lastDay ? lastDay >= tomorrow : true;
    return (
        <div className={cn('space-y-3 p-4', ROW)}>
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white"><Flame size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{t('Daily bonus')}</p>
                    <p className="text-[12px] text-gray-500 dark:text-zinc-400">{claimed ? (moreDays ? t('Claimed. Come back tomorrow for {points} more.', { points: g.dailyBonus.points }) : t('Claimed. That was the last day.')) : t('{points} points every day you show up', { points: g.dailyBonus.points })}</p>
                </div>
                {claimed
                    ? <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-emerald-700 dark:text-neon-green"><Check size={15} /> {t('Today')}</span>
                    : <Button size="sm" icon={Gift} loading={busy} onClick={onClaim} className="shrink-0">{t('Claim')}</Button>}
            </div>
            <div className="flex gap-1.5">
                {days.map(d => {
                    const got = me.checkins.includes(d);
                    const isToday = d === today;
                    const past = d < today;
                    return (
                        <div key={d} className={cn(
                            'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider',
                            got ? 'bg-gradient-to-b from-orange-400 to-red-500 text-white' : isToday ? 'bg-black/[0.04] ring-2 ring-inset ring-orange-400 dark:bg-white/[0.06]' : 'bg-black/[0.03] text-gray-400 dark:bg-white/[0.04] dark:text-zinc-500',
                            past && !got && 'opacity-60'
                        )}>
                            <span>{new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                            {got ? <Flame size={13} /> : <span className="font-heading text-[12px]">+{g.dailyBonus.points}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ---------------- invite squad ---------------- */

export const InviteCard = ({ g, me, onShare, onWhatsApp, onStory, onCopy, storyBusy }) => {
    const t = useT();
    const milestones = g.referralMilestones || [];
    const count = me.referralCount || 0;
    const next = milestones.find(m => count < m.at);
    const top = milestones.length ? milestones[milestones.length - 1].at : 0;
    return (
        <div className={cn('space-y-4 p-4', ROW)}>
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple text-black"><Users size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{t('Bring your squad')}</p>
                    <p className="text-[12px] leading-snug text-gray-500 dark:text-zinc-400">
                        {t('+{points} for every friend who enters with your link', { points: g.referralPoints })}
                        {g.bonusSpinEvery > 0 && <> · {g.bonusSpinEvery === 1 ? t('each one also earns you a spin') : t('every {n} earn you a spin', { n: g.bonusSpinEvery })}</>}
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="font-heading text-[26px] font-black leading-none"><CountUp value={count} /></p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{count === 1 ? t('friend') : t('friends')}</p>
                </div>
            </div>

            {milestones.length > 0 && (
                <div className="space-y-2">
                    <div className="relative h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple transition-[width] duration-700" style={{ width: `${Math.min(100, (count / top) * 100)}%` }} />
                        {milestones.map(m => (
                            <span key={m.at} className={cn('absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2', count >= m.at ? 'border-white bg-neon-purple dark:border-[#0b0d12]' : 'border-black/10 bg-white dark:border-white/20 dark:bg-[#0b0d12]')} style={{ left: `${(m.at / top) * 100}%` }} />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {milestones.map(m => (
                            <span key={m.at} className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', count >= m.at ? 'bg-neon-purple/15 text-neon-purple' : 'bg-black/[0.04] text-gray-500 dark:bg-white/[0.06] dark:text-zinc-400')}>
                                {count >= m.at ? '✓ ' : ''}{t('{n} friends: +{bonus} bonus', { n: m.at, bonus: m.bonus })}
                            </span>
                        ))}
                    </div>
                    {next && <p className="text-[12px] font-semibold text-gray-600 dark:text-zinc-300">{next.at - count === 1 ? t('1 more friend unlocks +{bonus}.', { bonus: next.bonus }) : t('{n} more friends unlock +{bonus}.', { n: next.at - count, bonus: next.bonus })}</p>}
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button size="sm" onClick={onWhatsApp} className="bg-[#25D366] text-black">{t('WhatsApp')}</Button>
                <Button size="sm" variant="secondary" onClick={onStory} loading={storyBusy}><Instagram size={15} /> {t('Story')}</Button>
                <Button size="sm" variant="secondary" onClick={onCopy}>{t('Copy link')}</Button>
                <Button size="sm" variant="secondary" onClick={onShare}>{t('More')}</Button>
            </div>
        </div>
    );
};

/* ---------------- leaderboard ---------------- */

const PODIUM_STYLE = [
    { h: 'h-24', ring: 'ring-yellow-300', bg: 'from-yellow-200 to-amber-400', label: '1' },
    { h: 'h-16', ring: 'ring-zinc-300', bg: 'from-zinc-100 to-zinc-300', label: '2' },
    { h: 'h-12', ring: 'ring-orange-300', bg: 'from-orange-200 to-orange-400', label: '3' },
];

const initials = (name) => String(name || '?').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();

export const Leaderboard = ({ board, me, myId }) => {
    const t = useT();
    const rows = board?.leaderboard || [];
    if (!rows.length) return null;
    const podium = rows.slice(0, 3);
    const order = [1, 0, 2].filter(i => podium[i]);
    const rest = rows.slice(3);
    const meInTop = rows.some(r => r.id === myId);
    return (
        <div className="space-y-3">
            <div className={cn('flex items-end justify-center gap-3 px-4 pb-0 pt-5', ROW)}>
                {order.map(i => {
                    const p = podium[i];
                    const s = PODIUM_STYLE[i];
                    const mine = p.id === myId;
                    return (
                        <div key={p.id} className="flex min-w-0 flex-1 flex-col items-center">
                            {i === 0 && <Crown size={20} className="mb-1 text-yellow-400" />}
                            <span className={cn('flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br font-heading text-[15px] font-black text-black ring-4', s.bg, s.ring, mine && 'outline outline-2 outline-offset-2 outline-neon-green')}>{initials(p.name)}</span>
                            <span className="mt-1.5 max-w-full truncate text-[13px] font-bold">{mine ? t('You') : p.name}</span>
                            <span className="text-[12px] font-black tabular-nums text-gray-500 dark:text-zinc-400">{p.entryScore} {t('pts')}</span>
                            <div className={cn('mt-2 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b pt-1.5 font-heading text-[20px] font-black text-black/70', s.bg, s.h)}>{s.label}</div>
                        </div>
                    );
                })}
            </div>
            {(rest.length > 0 || (me && !meInTop)) && (
                <ol className={cn('divide-y divide-black/[0.05] px-4 dark:divide-white/[0.06]', ROW)}>
                    {rest.map((p, i) => (
                        <li key={p.id} className={cn('flex items-center gap-3 py-3', p.id === myId && 'font-bold text-emerald-700 dark:text-neon-green')}>
                            <span className="w-7 text-center text-[13px] font-black text-gray-400">{i + 4}</span>
                            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{p.id === myId ? t('You') : p.name}</span>
                            <span className="text-[14px] font-black tabular-nums">{p.entryScore}</span>
                        </li>
                    ))}
                    {me && !meInTop && (
                        <li className="flex items-center gap-3 py-3 text-emerald-700 dark:text-neon-green">
                            <span className="w-7 text-center text-[13px] font-black">{me.rank ? `#${me.rank}` : '…'}</span>
                            <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{t('You')}</span>
                            <span className="text-[14px] font-black tabular-nums">{me.entryScore}</span>
                        </li>
                    )}
                </ol>
            )}
        </div>
    );
};

/* ---------------- fair play ---------------- */

export const FairPlay = () => {
    const t = useT();
    return (
        <div className={cn('flex items-start gap-3 p-4', ROW)}>
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-neon-green" />
            <div className="space-y-1 text-[13px] leading-relaxed text-gray-600 dark:text-zinc-400">
                <p className="font-bold text-gray-900 dark:text-white">{t('How winners are picked')}</p>
                <p>{t('When entries close, winners are drawn at random. Every point you hold is one ticket, so more points means better odds, but anyone can win.')}</p>
                <p>{t('Points are counted on our side, never on your phone. We check follows and comments before announcing, and fake or duplicate accounts are taken out of the draw.')}</p>
            </div>
        </div>
    );
};
