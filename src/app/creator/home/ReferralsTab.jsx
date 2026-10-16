import React from 'react';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import UsersRound from 'lucide-react/dist/esm/icons/users-round';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import { Button, Section, Stat, StatRow } from '../../../components/app';
import { copyToClipboard } from '../../../lib/clipboard';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { cn } from '../../../lib/utils';
import { appUrl, APP_ORIGIN } from '../../host';
import { EmptyState } from '../../pages/parts';
import { creatorPassId, handleOf } from '../format';
import { StatusChip } from '../ui';

/*
 * Referrals: your invite link, the creators who applied with it, and the top
 * 10. All from the server (creator-referrals), never the whole creators list.
 * No points are promised for referrals: nothing credits them yet.
 */

const inviteUrl = (code) => {
    const path = `/creator/apply?ref=${encodeURIComponent(code)}`;
    const url = appUrl(path);
    return /^https?:/.test(url) ? url : `${typeof window !== 'undefined' ? window.location.origin : APP_ORIGIN}${url}`;
};

const PersonRow = ({ person, rank, me }) => {
    const handle = handleOf(person.instagram);
    return (
        <li className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5', me && 'bg-emerald-500/[0.07] dark:bg-neon-green/[0.07]')}>
            {rank && <span className="w-6 shrink-0 text-center text-[13px] font-black text-gray-400">{rank}</span>}
            {person.profilePicture
                ? <img src={person.profilePicture} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[14px] font-black dark:bg-white/[0.07]">{(person.name || handle || '?').charAt(0).toUpperCase()}</span>}
            <div className="min-w-0 flex-1">
                {(person.name || handle) && <p className="truncate text-[15px] font-bold">{person.name || `@${handle}`}</p>}
                {person.name && handle && <p className="truncate text-[13px] text-gray-500 dark:text-zinc-400">@{handle}</p>}
            </div>
            {person.referralCount > 0
                ? <span className="shrink-0 text-[14px] font-black">{person.referralCount}</span>
                : <StatusChip status={person.profileStatus} />}
        </li>
    );
};

const ReferralsTab = ({ creator, referrals }) => {
    const addToast = useLegacyStore(s => s.addToast);
    const code = creatorPassId(creator);
    const link = code ? inviteUrl(code) : null;
    const list = referrals?.list || [];
    const approved = list.filter(r => r.profileStatus === 'approved').length;
    const board = referrals?.leaderboard || [];
    const myUid = creator.uid || creator.id;

    const copy = async () => {
        if (await copyToClipboard(link)) addToast?.('Invite link copied', 'success');
    };
    // Called straight from the tap, so Safari treats it as a user gesture.
    const share = () => {
        if (navigator.share) {
            navigator.share({ title: 'Join Newbi Creators', text: 'Apply to Newbi Creators with my invite link:', url: link }).catch(() => {});
        } else {
            copy();
        }
    };

    return (
        <div className="space-y-6">
            {link && (
                <section className="space-y-3 rounded-3xl border border-black/[0.06] bg-white p-5 dark:border-white/[0.07] dark:bg-[#0c0e14]">
                    <div>
                        <h2 className="font-heading text-[20px] font-black tracking-tight">Invite creators you rate</h2>
                        <p className="mt-1 text-[14px] text-gray-600 dark:text-zinc-400">Anyone who applies with your link shows up here.</p>
                    </div>
                    <p className="truncate rounded-2xl bg-black/[0.04] px-4 py-3 font-mono text-[13px] text-gray-700 dark:bg-white/[0.05] dark:text-zinc-300">{link}</p>
                    <div className="flex gap-2">
                        <Button className="flex-1" icon={Share2} onClick={share}>Share link</Button>
                        <Button variant="secondary" icon={Copy} onClick={copy} aria-label="Copy invite link">Copy</Button>
                    </div>
                </section>
            )}

            <StatRow>
                <Stat label="Applied" value={list.length || null} />
                <Stat label="Approved" value={approved || null} tone="accent" />
                <Stat label="Your rank" value={referrals?.myRank ? `#${referrals.myRank}` : null} />
            </StatRow>

            {!referrals ? (
                <div className="h-32 animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />
            ) : list.length ? (
                <Section title="Applied with your link">
                    <ul className="space-y-1">{list.map(p => <PersonRow key={p.uid} person={p} />)}</ul>
                </Section>
            ) : (
                <EmptyState icon={UsersRound} title="No referrals yet" message="Share your link with creators you know." />
            )}

            {board.length > 0 && (
                <Section title="Top referrers" action={<Trophy size={16} className="text-amber-500" />}>
                    <ol className="space-y-1">{board.map((p, i) => <PersonRow key={p.uid} person={p} rank={i + 1} me={p.uid === myUid} />)}</ol>
                </Section>
            )}
        </div>
    );
};

export default ReferralsTab;
