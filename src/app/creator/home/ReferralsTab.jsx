import React, { useState } from 'react';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import UsersRound from 'lucide-react/dist/esm/icons/users-round';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Crown from 'lucide-react/dist/esm/icons/crown';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Medal from 'lucide-react/dist/esm/icons/medal';
import Check from 'lucide-react/dist/esm/icons/check';
import TicketPercent from 'lucide-react/dist/esm/icons/ticket-percent';
import { Button } from '../../../components/app';
import { accent } from '../../../components/admin/theme';
import { copyToClipboard } from '../../../lib/clipboard';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { cn } from '../../../lib/utils';
import { REFERRAL_TIERS, tierById, tierProgress } from '../../../lib/creator/referralTiers';
import { EmptyState, HeroPanel } from '../../pages/parts';
import { creatorPassId, handleOf } from '../format';
import { inviteUrl, shareInvite, whatsappShareUrl } from '../referral';
import { ToneChip } from '../ui';

/*
 * Referrals: your invite link, your tier, this month's and the all-time
 * boards, and the creators who applied with your link. Everything is worked
 * out by the server (creator-referrals); only approved referrals count.
 * The leaderboard follows the admin one (podium, medals, bars to the leader).
 */

const CARD = 'rounded-3xl border border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-[#0c0e14]';

const MEDALS = {
    1: { ring: 'bg-amber-400 text-black', card: accent('amber'), bar: 'bg-amber-400' },
    2: { ring: 'bg-zinc-300 text-zinc-900 dark:bg-zinc-400', card: accent('gray'), bar: 'bg-zinc-400' },
    3: { ring: 'bg-orange-500 text-white dark:bg-orange-400 dark:text-black', card: accent('orange'), bar: 'bg-orange-500 dark:bg-orange-400' },
};

const PERIODS = [
    { id: 'month', label: 'This month' },
    { id: 'all', label: 'All time' },
];

const Avatar = ({ person, size = 40, className }) => {
    const handle = handleOf(person.instagram);
    const style = { width: size, height: size };
    return person.profilePicture
        ? <img src={person.profilePicture} alt="" referrerPolicy="no-referrer" loading="lazy" style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
        : (
            <span style={{ ...style, fontSize: Math.round(size * 0.38) }} className={cn('flex shrink-0 items-center justify-center rounded-full bg-black/[0.06] font-black text-gray-600 dark:bg-white/[0.08] dark:text-zinc-300', className)}>
                {(person.name || handle || '?').charAt(0).toUpperCase()}
            </span>
        );
};

const RankPill = ({ rank, size = 32 }) => (
    <span
        className={cn('flex shrink-0 items-center justify-center rounded-full font-extrabold tabular-nums',
            MEDALS[rank]?.ring || 'bg-black/[0.05] text-gray-500 dark:bg-white/[0.07] dark:text-zinc-400')}
        style={{ width: size, height: size, fontSize: size > 30 ? 13 : 11 }}
    >
        {rank}
    </span>
);

const displayName = (p) => p.name || (handleOf(p.instagram) ? `@${handleOf(p.instagram)}` : 'Creator');

/* ── Invite ─────────────────────────────────────────────────────────── */

const InviteCard = ({ link, code, onCopy }) => (
    <HeroPanel eyebrow="Refer creators" title="Bring creators you rate. Climb the board.">
        <p className="text-[15px] text-gray-600 dark:text-zinc-300">Every creator who applies with your link and gets approved moves you up a tier.</p>
        <button
            type="button"
            onClick={onCopy}
            className="flex w-full items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-left ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/[0.08]"
            aria-label="Copy invite link"
        >
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-gray-700 dark:text-zinc-300">{link}</span>
            <Copy size={15} className="shrink-0 text-gray-400" />
        </button>
        <div className="flex flex-wrap gap-2 pt-1">
            <Button className="flex-1" icon={MessageCircle} href={whatsappShareUrl(link)} target="_blank" rel="noopener noreferrer">WhatsApp</Button>
            <Button variant="secondary" icon={Share2} onClick={() => shareInvite(link, onCopy)}>Share</Button>
        </div>
        {code && <p className="text-[12px] text-gray-500 dark:text-zinc-500">Your invite code <span className="font-mono font-bold text-gray-700 dark:text-zinc-300">{code}</span> is built into the link.</p>}
    </HeroPanel>
);

/* ── Tier ───────────────────────────────────────────────────────────── */

const TierCard = ({ approved }) => {
    const { tier, next, toNext, ratio } = tierProgress(approved);
    const tone = accent(tier?.tone || 'green');
    const nextTone = accent(next?.tone || tier?.tone || 'green');
    return (
        <section className={cn(CARD, 'p-5')}>
            <div className="flex items-center gap-3">
                <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tier ? tone.chip : 'bg-black/[0.05] text-gray-400 dark:bg-white/[0.06]')}>
                    <Medal size={22} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400">Your tier</p>
                    <p className={cn('font-heading text-[22px] font-extrabold leading-tight tracking-tight', tier && tone.text)}>{tier ? tier.label : 'No tier yet'}</p>
                </div>
                <div className="text-right">
                    <p className="font-heading text-[26px] font-extrabold leading-none tabular-nums">{approved}</p>
                    <p className="text-[11px] font-semibold text-gray-500">approved</p>
                </div>
            </div>

            <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <div className={cn('h-full rounded-full transition-[width] duration-500', nextTone.dot)} style={{ width: `${Math.max(4, ratio * 100)}%` }} />
                </div>
                <p className="mt-2 text-[13px] text-gray-600 dark:text-zinc-400">
                    {next
                        ? <><span className="font-bold text-gray-900 dark:text-white">{toNext} more approved creator{toNext === 1 ? '' : 's'}</span> to {next.label}</>
                        : 'You’ve reached the top tier. Thank you for growing the community.'}
                </p>
            </div>

            <ol className="mt-4 space-y-1.5">
                {REFERRAL_TIERS.map(t => {
                    const reached = approved >= t.min;
                    const a = accent(t.tone);
                    return (
                        <li key={t.id} className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5', reached ? a.soft : 'bg-black/[0.02] dark:bg-white/[0.02]')}>
                            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black tabular-nums', reached ? a.solid : 'bg-black/[0.06] text-gray-500 dark:bg-white/[0.07] dark:text-zinc-400')}>
                                {reached ? <Check size={14} strokeWidth={3} /> : t.min}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className={cn('block text-[14px] font-bold', reached && a.text)}>{t.label} <span className="font-semibold text-gray-400">· {t.min} approved</span></span>
                                <span className="block text-[13px] text-gray-600 dark:text-zinc-400">{t.reward}</span>
                            </span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

/* ── Stats ──────────────────────────────────────────────────────────── */

const StatTile = ({ icon: Icon, tone, label, value, hint }) => {
    const a = accent(tone);
    return (
        <div className={cn(CARD, 'rounded-2xl p-4')}>
            <div className="flex items-center gap-2">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', a.chip)}><Icon size={16} /></span>
                <p className="truncate text-[12px] font-semibold text-gray-500 dark:text-zinc-400">{label}</p>
            </div>
            <p className="mt-2 truncate font-heading text-[24px] font-extrabold leading-tight tabular-nums">{value}</p>
            {hint && <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500 dark:text-zinc-400">{hint}</p>}
        </div>
    );
};

/* ── Leaderboard ────────────────────────────────────────────────────── */

const PodiumCard = ({ row, leader, me, tall }) => {
    const medal = MEDALS[row.rank] || MEDALS[3];
    return (
        <div className={cn('relative flex flex-col items-center rounded-3xl border px-2 pb-4 text-center', medal.card.border, medal.card.soft,
            tall ? 'pt-6' : 'mt-6 pt-4', me && 'ring-2 ring-emerald-500/60 dark:ring-neon-green/60')}>
            {row.rank === 1 && <Crown size={22} className="absolute -top-3 rounded-full bg-white p-0.5 text-amber-500 dark:bg-[#0c0e14]" />}
            <div className="relative">
                <Avatar person={row} size={tall ? 60 : 48} />
                <span className="absolute -bottom-1 -right-1"><RankPill rank={row.rank} size={24} /></span>
            </div>
            <p className="mt-2 w-full truncate text-[13px] font-extrabold">{me ? 'You' : displayName(row)}</p>
            <p className={cn('mt-1 font-heading text-[26px] font-extrabold leading-none tabular-nums', medal.card.text)}>{row.score}</p>
            <p className="text-[11px] font-semibold text-gray-500">approved</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div className={cn('h-full rounded-full', medal.bar)} style={{ width: `${Math.max(6, (row.score / leader) * 100)}%` }} />
            </div>
        </div>
    );
};

const BoardRow = ({ row, leader, me }) => {
    const tier = tierById(row.tier);
    return (
        <li className={cn('flex items-center gap-3 px-4 py-3', me && 'bg-emerald-500/[0.07] dark:bg-neon-green/[0.07]')}>
            <RankPill rank={row.rank} />
            <Avatar person={row} size={38} />
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-bold">{me ? 'You' : displayName(row)}</span>
                    {tier && <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide', accent(tier.tone).chip)}>{tier.label}</span>}
                </span>
                <span className="mt-1.5 block h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <span className="block h-full rounded-full bg-emerald-500 dark:bg-neon-green" style={{ width: `${Math.max(4, (row.score / leader) * 100)}%` }} />
                </span>
            </span>
            <span className="w-12 shrink-0 text-right">
                <span className="block text-[18px] font-extrabold leading-none tabular-nums">{row.score}</span>
                <span className="text-[11px] text-gray-500">approved</span>
            </span>
        </li>
    );
};

const Leaderboard = ({ referrals, myUid }) => {
    const [period, setPeriod] = useState('month');
    const rows = (period === 'month' ? referrals.monthLeaderboard : referrals.leaderboard) || [];
    const mine = period === 'month' ? referrals.me?.monthRow : referrals.me?.row;
    const leader = rows[0]?.score || 1;
    const podium = rows.slice(0, 3);
    const rest = rows.slice(3);
    const meShown = rows.some(r => r.uid === myUid);

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="flex items-center gap-2 font-heading text-[20px] font-black tracking-tight"><Trophy size={18} className="text-amber-500" /> Leaderboard</h2>
                <div className="inline-flex gap-1 rounded-2xl bg-black/[0.04] p-1 dark:bg-white/[0.05]" role="tablist" aria-label="Leaderboard period">
                    {PERIODS.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            role="tab"
                            aria-selected={period === p.id}
                            onClick={() => setPeriod(p.id)}
                            className={cn('h-9 whitespace-nowrap rounded-xl px-3 text-[13px] font-bold transition-colors',
                                period === p.id ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white')}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {rows.length === 0 ? (
                <div className={cn(CARD, 'p-2')}>
                    <EmptyState
                        icon={Trophy}
                        title={period === 'month' ? 'Nobody on the board this month' : 'No approved referrals yet'}
                        message="The first creator whose invite gets approved takes the top spot."
                    />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 items-start gap-2">
                        {/* 2 · 1 · 3, like a podium. */}
                        <div>{podium[1] && <PodiumCard row={podium[1]} leader={leader} me={podium[1].uid === myUid} />}</div>
                        <div><PodiumCard row={podium[0]} leader={leader} me={podium[0].uid === myUid} tall /></div>
                        <div>{podium[2] && <PodiumCard row={podium[2]} leader={leader} me={podium[2].uid === myUid} />}</div>
                    </div>
                    {(rest.length > 0 || (!meShown && mine)) && (
                        <ol className={cn(CARD, 'overflow-hidden rounded-2xl divide-y divide-black/[0.05] dark:divide-white/[0.05]')}>
                            {rest.map(r => <BoardRow key={r.uid} row={r} leader={leader} me={r.uid === myUid} />)}
                            {!meShown && mine && <BoardRow row={mine} leader={leader} me />}
                        </ol>
                    )}
                </>
            )}
            <p className="px-1 text-[12px] text-gray-500 dark:text-zinc-500">
                Ranked by approved referrals{period === 'month' ? ' from creators who applied this month (resets on the 1st)' : ''}. Applications still in review don’t count yet.
            </p>
        </section>
    );
};

/* ── Your referrals ─────────────────────────────────────────────────── */

const referralChip = (p) => {
    if (p.counts) return { tone: 'green', label: 'Counts' };
    if (p.voided) return { tone: 'gray', label: 'Doesn’t count' };
    if (!p.profileStatus || p.profileStatus === 'pending' || p.profileStatus === 'pending_verification') return { tone: 'amber', label: 'In review' };
    return { tone: 'gray', label: 'Not approved' };
};

const YourReferrals = ({ list }) => (
    <section className="space-y-3">
        <h2 className="px-1 font-heading text-[20px] font-black tracking-tight">Applied with your link</h2>
        {list.length ? (
            <ul className={cn(CARD, 'overflow-hidden rounded-2xl divide-y divide-black/[0.05] dark:divide-white/[0.05]')}>
                {list.map(p => {
                    const chip = referralChip(p);
                    const handle = handleOf(p.instagram);
                    return (
                        <li key={p.uid} className="flex items-center gap-3 px-4 py-3">
                            <Avatar person={p} size={40} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-bold">{displayName(p)}</p>
                                {p.name && handle && <p className="truncate text-[13px] text-gray-500 dark:text-zinc-400">@{handle}</p>}
                            </div>
                            <ToneChip tone={chip.tone}>{chip.label}</ToneChip>
                        </li>
                    );
                })}
            </ul>
        ) : (
            <div className={cn(CARD, 'p-2')}>
                <EmptyState icon={UsersRound} title="No one yet" message="Send your link to two or three creators you know. They show up here as soon as they apply." />
            </div>
        )}
    </section>
);

/* ── Coming soon + rules ────────────────────────────────────────────── */

const PointsSoon = () => (
    <section className={cn(CARD, 'flex gap-4 p-5', accent('fuchsia').soft)}>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', accent('fuchsia').chip)}><TicketPercent size={20} /></span>
        <div className="min-w-0 space-y-1">
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold">Newbi points and vouchers <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-600 dark:bg-white/[0.1] dark:text-zinc-300">Coming soon</span></p>
            <p className="text-[14px] text-gray-600 dark:text-zinc-400">Approved referrals will earn Newbi points you can swap for vouchers from our partner brands. Your approved referrals are already being tracked.</p>
        </div>
    </section>
);

const STEPS = [
    { title: 'Share your link', body: 'On WhatsApp, in your stories, or with your college group.' },
    { title: 'They get approved', body: 'Our team reviews them, or their Instagram check approves them.' },
    { title: 'You move up', body: 'Each approved creator counts towards your tier and your rank.' },
];

const HowItWorks = () => (
    <section className={cn(CARD, 'p-5')}>
        <h2 className="font-heading text-[18px] font-black tracking-tight">How it works</h2>
        <ol className="mt-3 space-y-3">
            {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon-green text-[13px] font-black text-black">{i + 1}</span>
                    <span className="min-w-0">
                        <span className="block text-[14px] font-bold">{s.title}</span>
                        <span className="block text-[13px] text-gray-600 dark:text-zinc-400">{s.body}</span>
                    </span>
                </li>
            ))}
        </ol>
        <p className="mt-4 border-t border-black/[0.06] pt-3 text-[12px] text-gray-500 dark:border-white/[0.06] dark:text-zinc-500">
            Only approved creators count. Inviting yourself or a second account doesn’t count, and we can remove referrals that break the rules.
        </p>
    </section>
);

/* ── Page ───────────────────────────────────────────────────────────── */

const ReferralsTab = ({ creator, referrals }) => {
    const addToast = useLegacyStore(s => s.addToast);
    const code = creatorPassId(creator);
    const link = inviteUrl(code);
    const myUid = creator.uid || creator.id;
    const me = referrals?.me || { approved: 0, pending: 0, month: 0 };

    const copy = async () => {
        if (await copyToClipboard(link)) addToast?.('Invite link copied', 'success');
    };

    return (
        <div className="space-y-6">
            {link && <InviteCard link={link} code={code} onCopy={copy} />}

            {!referrals ? (
                <div className="space-y-3">
                    <div className="h-56 animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />
                    <div className="h-40 animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />
                </div>
            ) : (
                <>
                    <TierCard approved={me.approved || 0} />
                    <div className="grid grid-cols-2 gap-3">
                        <StatTile icon={ShieldCheck} tone="green" label="Approved" value={me.approved || 0} hint="Count towards your tier" />
                        <StatTile icon={Hourglass} tone="amber" label="In review" value={me.pending || 0} hint="Count once approved" />
                        <StatTile icon={Trophy} tone="violet" label="All-time rank" value={me.rank ? `#${me.rank}` : 'Unranked'} hint={referrals.referrers ? `of ${referrals.referrers} referrers` : null} />
                        <StatTile icon={CalendarDays} tone="pink" label="This month" value={me.month || 0} hint={me.monthRank ? `Approved · #${me.monthRank} this month` : 'Approved this month'} />
                    </div>
                    <Leaderboard referrals={referrals} myUid={myUid} />
                    <YourReferrals list={referrals.list || []} />
                    <PointsSoon />
                    <HowItWorks />
                </>
            )}
        </div>
    );
};

export default ReferralsTab;
