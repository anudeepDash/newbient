import React, { useMemo, useState } from 'react';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Crown from 'lucide-react/dist/esm/icons/crown';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Users from 'lucide-react/dist/esm/icons/users';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Info from 'lucide-react/dist/esm/icons/info';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import { useStore } from '../../../lib/store';
import { REFERRAL_TIERS } from '../../../lib/creator/referralTiers';
import { cn } from '../../../lib/utils';
import { PREDEFINED_CITIES } from '../../../lib/constants';
import { exportSubtitle, fileDate } from '../../../lib/xlsx';
import { accent } from '../theme';
import { Card, Badge, CreatorStatusBadge, SearchInput, Select, SegmentedTabs, EmptyState, Avatar, StatTile } from '../ui';
import ExportMenu from '../ExportMenu';
import { creatorKey, creatorPhoto, creatorReach, isBangaloreVariant, formatCount, formatDate } from '../creatorPortal/creatorUtils';
import { buildReferralLeaderboard, matchesCreatorSearch, creatorJoinedAt } from './creatorData';

/*
 * Referral leaderboard: who brought in the most creators with their invite
 * link (/creator/apply?ref=…). Scores come from each creator's `referredBy`.
 * Ranked by approved referrals that aren't voided (the same count the app
 * uses for tiers, src/lib/creator/referralTiers.js). Voiding a referral here
 * takes it off the referrer's tier and rank.
 */

const PERIODS = [
    { value: 'all', label: 'All time', days: 0 },
    { value: '30', label: 'Last 30 days', days: 30 },
    { value: '7', label: 'Last 7 days', days: 7 },
];

const MEDALS = {
    1: { label: 'Gold', ring: 'bg-amber-400 text-black', card: accent('amber'), bar: 'bg-amber-400' },
    2: { label: 'Silver', ring: 'bg-zinc-300 text-zinc-900 dark:bg-zinc-400', card: accent('gray'), bar: 'bg-zinc-400' },
    3: { label: 'Bronze', ring: 'bg-orange-500 text-white dark:bg-orange-400 dark:text-black', card: accent('orange'), bar: 'bg-orange-500 dark:bg-orange-400' },
};
const ROW_TONES = ['pink', 'violet', 'blue', 'teal', 'fuchsia', 'cyan', 'indigo'];

const RankPill = ({ rank, size = 36 }) => {
    const medal = MEDALS[rank];
    return (
        <span
            className={cn('flex shrink-0 items-center justify-center rounded-full font-extrabold tabular-nums',
                medal ? medal.ring : rank <= 10 ? accent('pink').chip : 'bg-black/[0.05] text-gray-500 dark:bg-white/[0.06] dark:text-zinc-400')}
            style={{ width: size, height: size, fontSize: size > 40 ? 18 : 13 }}
        >
            {rank}
        </span>
    );
};

const PodiumCard = ({ row, leader, onOpen, tall }) => {
    const medal = MEDALS[row.rank] || MEDALS[3];
    const c = row.creator;
    return (
        <button
            type="button"
            onClick={() => onOpen(c)}
            className={cn('relative flex w-full flex-col items-center rounded-3xl border p-5 text-center transition-transform hover:-translate-y-0.5',
                medal.card.border, medal.card.soft, tall ? 'sm:pb-8 sm:pt-7' : 'sm:mt-8')}
        >
            {row.rank === 1 && <Crown size={22} className="absolute -top-3 rounded-full bg-white p-0.5 text-amber-500 dark:bg-[#0d0f15]" />}
            <div className="relative">
                <Avatar src={creatorPhoto(c)} name={c.name} size={tall ? 76 : 64} className="rounded-full" />
                <span className="absolute -bottom-1 -right-1"><RankPill rank={row.rank} size={30} /></span>
            </div>
            <p className="mt-3 w-full truncate text-[16px] font-extrabold">{c.name || 'Unnamed creator'}</p>
            <p className="w-full truncate text-[12px] text-gray-500">{[c.city, c.creatorId && `ID ${c.creatorId}`].filter(Boolean).join(' · ') || '—'}</p>
            <p className={cn('mt-3 font-heading text-[34px] font-extrabold leading-none tabular-nums', medal.card.text)}>{row.verified}</p>
            <p className="text-[12px] font-semibold text-gray-500">approved referral{row.verified === 1 ? '' : 's'}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div className={cn('h-full rounded-full', medal.bar)} style={{ width: `${Math.max(6, (row.verified / leader) * 100)}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {row.tier && <Badge tone={row.tier.tone}>{row.tier.label}</Badge>}
                <Badge tone="gray">{row.count} signed up</Badge>
                {row.pending > 0 && <Badge tone="amber">{row.pending} pending</Badge>}
                {row.voided > 0 && <Badge tone="rose">{row.voided} voided</Badge>}
            </div>
        </button>
    );
};

const CreatorLeaderboard = ({ creators, onSelectCreator }) => {
    const [search, setSearch] = useState('');
    const [period, setPeriod] = useState('all');
    const [city, setCity] = useState('all');
    const [expanded, setExpanded] = useState(null);

    const since = useMemo(() => {
        const days = PERIODS.find(p => p.value === period)?.days || 0;
        return days ? Date.now() - days * 86400000 : 0;
    }, [period]);

    const board = useMemo(() => buildReferralLeaderboard(creators, { since, city }), [creators, since, city]);
    const rows = useMemo(() => board.rows.filter(r => matchesCreatorSearch(r.creator, search, 'all')), [board, search]);
    const leader = board.rows[0]?.verified || 1;

    const cityOptions = useMemo(() => {
        const set = new Set(PREDEFINED_CITIES.filter(c => c !== 'Others'));
        creators.forEach(c => { if (c.city && !isBangaloreVariant(c.city)) set.add(String(c.city).trim()); });
        return [{ value: 'all', label: 'All cities' }, ...[...set].sort().map(c => ({ value: c, label: c }))];
    }, [creators]);

    const totals = useMemo(() => {
        const signups = board.rows.reduce((s, r) => s + r.count, 0);
        const verified = board.rows.reduce((s, r) => s + r.verified, 0);
        return { signups, verified, rate: signups ? Math.round((verified / signups) * 100) : 0 };
    }, [board]);

    const top = board.rows[0];
    const podium = !search && rows.length > 0 ? rows.slice(0, 3) : [];
    const rest = podium.length ? rows.slice(podium.length) : rows;
    const periodLabel = PERIODS.find(p => p.value === period)?.label;

    const exportSpec = () => ({
        filename: `newbi-referral-leaderboard-${period === 'all' ? 'all-time' : `${period}-days`}-${fileDate()}`,
        sheetName: 'Leaderboard',
        title: 'Creator referral leaderboard',
        subtitle: exportSubtitle(rows.length, 'referrer', [periodLabel, city !== 'all' ? city : null].filter(Boolean).join(' · ')),
        rows,
        totals: { count: true, verified: true },
        columns: [
            { header: 'Rank', type: 'number', value: r => r.rank },
            { header: 'Name', value: r => r.creator.name || '' },
            { header: 'Creator ID', value: r => r.creator.creatorId || '' },
            { header: 'City', value: r => r.creator.city || '' },
            { header: 'Phone', value: r => r.creator.phone || '' },
            { header: 'Email', value: r => r.creator.email || '' },
            { header: 'Referrals', key: 'count', type: 'number', value: r => r.count },
            { header: 'Verified referrals', key: 'verified', type: 'number', value: r => r.verified },
            { header: 'Pending referrals', type: 'number', value: r => r.pending },
            { header: 'Voided referrals', type: 'number', value: r => r.voided },
            { header: 'Tier', value: r => r.tier?.label || '' },
            { header: 'Referred reach', type: 'number', value: r => r.reach },
            { header: 'Latest referral', type: 'date', value: r => (r.latest ? new Date(r.latest) : null) },
        ],
    });

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatTile label="Referred sign-ups" value={totals.signups.toLocaleString()} hint={periodLabel} icon={UserPlus} tone="pink" />
                <StatTile label="Active referrers" value={board.rows.length.toLocaleString()} hint="Brought in at least one" icon={Users} tone="violet" />
                <StatTile label="Verified referrals" value={totals.verified.toLocaleString()} hint={`${totals.rate}% of referred sign-ups`} icon={ShieldCheck} tone="green" />
                <StatTile label="Top referrer" value={top ? top.verified : 0} hint={top ? top.creator.name : 'No referrals yet'} icon={Trophy} tone="amber" onClick={top ? () => onSelectCreator(top.creator) : undefined} />
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={period} onChange={setPeriod} items={PERIODS.map(p => ({ value: p.value, label: p.label }))} />
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search referrers" className="min-w-[180px] flex-1 xl:max-w-xs" />
                    <Select label="City" value={city} onChange={setCity} options={cityOptions} className="w-40" />
                    <ExportMenu getSpec={exportSpec} />
                </div>
            </div>

            {rows.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState
                        icon={Trophy}
                        tone="amber"
                        title={board.rows.length ? 'No referrers match your search' : period === 'all' && city === 'all' ? 'No referrals yet' : 'No referrals in this view'}
                        description={board.rows.length ? 'Try another name.' : 'Creators share their invite link (/creator/join?ref=their ID). Sign-ups that use it count here.'}
                    />
                </Card>
            ) : (
                <>
                    {podium.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-start">
                            {/* Desktop shows 2 · 1 · 3 like a podium; phones list them in order. */}
                            {podium[1] && <div className="order-2 sm:order-1"><PodiumCard row={podium[1]} leader={leader} onOpen={onSelectCreator} /></div>}
                            <div className="order-1 sm:order-2"><PodiumCard row={podium[0]} leader={leader} onOpen={onSelectCreator} tall /></div>
                            {podium[2] && <div className="order-3"><PodiumCard row={podium[2]} leader={leader} onOpen={onSelectCreator} /></div>}
                        </div>
                    )}

                    {rest.length > 0 && (
                        <Card className="overflow-hidden rounded-2xl">
                            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                {rest.map((r, i) => {
                                    const key = creatorKey(r.creator);
                                    const isOpen = expanded === key;
                                    const tone = accent(MEDALS[r.rank] ? (r.rank === 1 ? 'amber' : r.rank === 2 ? 'gray' : 'orange') : ROW_TONES[i % ROW_TONES.length]);
                                    return (
                                        <li key={key}>
                                            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                                <RankPill rank={r.rank} />
                                                <button type="button" onClick={() => onSelectCreator(r.creator)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                                    <Avatar src={creatorPhoto(r.creator)} name={r.creator.name} size={40} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="truncate text-[15px] font-bold hover:underline">{r.creator.name || 'Unnamed creator'}</span>
                                                            {r.tier && <Badge tone={r.tier.tone} className="shrink-0">{r.tier.label}</Badge>}
                                                        </span>
                                                        <span className="block truncate text-[12px] text-gray-500">{[r.creator.city, r.creator.creatorId && `ID ${r.creator.creatorId}`].filter(Boolean).join(' · ') || '—'}</span>
                                                        <span className="mt-1.5 block h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                                                            <span className={cn('block h-full rounded-full', tone.dot)} style={{ width: `${Math.max(4, (r.verified / leader) * 100)}%` }} />
                                                        </span>
                                                    </span>
                                                </button>
                                                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                                                    <Badge tone="gray">{r.count} signed up</Badge>
                                                    {r.pending > 0 && <Badge tone="amber">{r.pending} pending</Badge>}
                                                    {r.voided > 0 && <Badge tone="rose">{r.voided} voided</Badge>}
                                                </div>
                                                <div className="w-14 shrink-0 text-right">
                                                    <p className={cn('text-[20px] font-extrabold leading-none tabular-nums', tone.text)}>{r.verified}</p>
                                                    <p className="text-[11px] text-gray-500">approved</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpanded(isOpen ? null : key)}
                                                    aria-expanded={isOpen}
                                                    aria-label={isOpen ? 'Hide referrals' : 'Show referrals'}
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-black/5 dark:hover:bg-white/5"
                                                >
                                                    <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />
                                                </button>
                                            </div>
                                            {isOpen && <ReferralList referrals={r.referrals} onOpen={onSelectCreator} />}
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    )}

                    {podium.length > 0 && (
                        <Card className="overflow-hidden rounded-2xl">
                            <p className="border-b border-black/[0.06] px-4 py-3 text-[13px] font-bold dark:border-white/[0.06] sm:px-5">Who the top {podium.length} brought in</p>
                            <div className="grid divide-y divide-black/[0.05] dark:divide-white/[0.05] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                                {podium.map(r => (
                                    <div key={creatorKey(r.creator)} className="min-w-0">
                                        <p className="flex items-center gap-2 px-4 pt-3 text-[12px] font-bold text-gray-500"><RankPill rank={r.rank} size={22} /> {r.creator.name}</p>
                                        <ReferralList referrals={r.referrals} onOpen={onSelectCreator} compact />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </>
            )}

            {board.unmatched.length > 0 && (
                <Card className="rounded-2xl border-amber-500/25 bg-amber-500/[0.04] p-4 dark:border-amber-500/25 dark:bg-amber-500/[0.04]">
                    <p className="flex items-center gap-2 text-[14px] font-bold"><AlertTriangle size={15} className="text-amber-600 dark:text-amber-300" /> Referral codes that don't match a creator</p>
                    <p className="mt-0.5 text-[12px] text-gray-500">{board.unmatched.reduce((s, u) => s + u.count, 0)} sign-ups used these codes, so nobody gets credit for them. They may be typos or deleted creators.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {board.unmatched.slice(0, 20).map(u => <Badge key={u.code} tone="amber">{u.code}{u.count > 1 ? ` · ${u.count}` : ''}</Badge>)}
                    </div>
                </Card>
            )}

            <p className="flex items-start gap-1.5 text-[12px] text-gray-500">
                <Info size={13} className="mt-0.5 shrink-0" />
                Ranked by approved sign-ups that used each creator's referral code (their ID, Instagram or LinkedIn handle), not counting voided ones; ties go to more sign-ups. Tiers: {REFERRAL_TIERS.map(t => `${t.label} ${t.min}`).join(', ')} approved.
            </p>
        </div>
    );
};

/* Voiding is for referrals that break the rules (a second account, a friend's fake page). It can be undone. */
const toggleVoid = async (rc) => {
    const { updateCreator, addToast } = useStore.getState();
    const voiding = !rc.referralVoid;
    try {
        await updateCreator(creatorKey(rc), { referralVoid: voiding, referralVoidAt: voiding ? new Date().toISOString() : null });
        addToast?.(voiding ? `${rc.name || 'Referral'} no longer counts for the referrer.` : `${rc.name || 'Referral'} counts again.`, 'success');
    } catch (error) {
        addToast?.(error?.message || 'Please try again.', 'error', {
            title: 'Referral not updated',
            action: { label: 'Try again', onClick: () => toggleVoid(rc) },
        });
    }
};

const ReferralList = ({ referrals, onOpen, compact }) => (
    <ul className={cn('space-y-0.5 px-2 pb-3', compact ? 'pt-1' : 'mx-4 mb-3 rounded-xl bg-black/[0.025] pt-2 dark:bg-white/[0.03] sm:mx-5')}>
        {referrals.slice(0, compact ? 5 : 50).map(rc => (
            <li key={creatorKey(rc)} className="flex items-center gap-1">
                <button type="button" onClick={() => onOpen(rc)} className={cn('flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-black/[0.04] dark:hover:bg-white/5', rc.referralVoid && 'opacity-60')}>
                    <Avatar src={creatorPhoto(rc)} name={rc.name} size={30} />
                    <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[13px] font-semibold', rc.referralVoid && 'line-through')}>{rc.name || 'Unnamed creator'}</span>
                        <span className="block truncate text-[11px] text-gray-500">{[rc.city, `${formatCount(creatorReach(rc))} followers`, creatorJoinedAt(rc) ? `joined ${formatDate(creatorJoinedAt(rc))}` : null].filter(Boolean).join(' · ')}</span>
                    </span>
                    {rc.referralVoid ? <Badge tone="rose">Voided</Badge> : <CreatorStatusBadge status={rc.profileStatus} />}
                </button>
                {!compact && (
                    <button
                        type="button"
                        onClick={() => toggleVoid(rc)}
                        title={rc.referralVoid ? 'Count this referral again' : 'Void: stop this referral counting for the referrer'}
                        aria-label={rc.referralVoid ? `Count ${rc.name || 'this referral'} again` : `Void ${rc.name || 'this referral'}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-black/5 hover:text-rose-600 dark:hover:bg-white/5 dark:hover:text-rose-400"
                    >
                        {rc.referralVoid ? <Undo2 size={15} /> : <Ban size={15} />}
                    </button>
                )}
            </li>
        ))}
        {referrals.length > (compact ? 5 : 50) && <li className="px-2 py-1 text-[12px] text-gray-500">and {referrals.length - (compact ? 5 : 50)} more</li>}
    </ul>
);

export default CreatorLeaderboard;
