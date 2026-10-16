import React, { useState } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAppStore, useCapability } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { appPath } from '../host';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';

/*
 * The two ways into the app, shown on Home until you've taken them:
 * become a creator (campaigns) and join the community (guestlists, gigs,
 * giveaways). Joining the community is one tap; signed-out visitors sign in
 * first and the join finishes when they come back.
 */

const Tile = ({ featured, icon: Icon, label, title, text, cta, to, onClick, busy }) => {
    const cls = cn(
        'group flex h-full gap-4 rounded-3xl p-5 text-left transition-transform active:scale-[0.99]',
        featured
            ? 'bg-neon-green text-black shadow-[0_18px_40px_-22px_rgba(57,255,20,0.8)]'
            : 'border border-black/[0.07] bg-white text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white'
    );
    const body = (
        <>
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                featured ? 'bg-black/10' : 'bg-emerald-500/10 text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green')}>
                <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
                <span className={cn('block text-[11px] font-black uppercase tracking-[0.18em]', featured ? 'text-black/60' : 'text-gray-500 dark:text-zinc-500')}>{label}</span>
                <span className="mt-0.5 block font-heading text-[19px] font-black leading-tight tracking-tight">{title}</span>
                <span className={cn('mt-1 block text-[14px] leading-snug', featured ? 'text-black/70' : 'text-gray-600 dark:text-zinc-400')}>{text}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[15px] font-bold">
                    {busy ? 'Joining…' : cta} <ArrowUpRight size={16} />
                </span>
            </span>
        </>
    );
    return to
        ? <Link to={to} className={cls}>{body}</Link>
        : <button type="button" onClick={onClick} disabled={busy} className={cls}>{body}</button>;
};

const JoinPaths = () => {
    const authUser = useAppStore(s => s.authUser);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const joinCommunity = useAppStore(s => s.joinCommunity);
    const isCreator = useCapability('creator');
    const isMember = useCapability('member');
    const { run } = useAuthGate();
    const [busy, setBusy] = useState(false);

    const join = async () => {
        setBusy(true);
        try {
            await joinCommunity();
            useLegacyStore.getState().addToast?.('You’re in. Guestlists, gigs and giveaways are open to you.', 'success');
        } catch (err) {
            useLegacyStore.getState().addToast?.('Couldn’t join just now. Please try again.', 'error');
        } finally {
            setBusy(false);
        }
    };
    useResumeIntent(INTENTS.joinCommunity, join);

    // Signed-in users: wait for the profile so a member never sees "Join".
    if (authUser && !profileLoaded) return null;

    const tiles = [
        !isCreator && {
            key: 'creator',
            featured: true,
            icon: Sparkles,
            label: 'Creators',
            title: 'Become a Newbi creator',
            text: 'Paid and barter campaigns, concert access and tickets for the shows you post about.',
            cta: 'Apply with your Instagram',
            to: appPath('/creator/apply'),
        },
        !isMember && {
            key: 'community',
            icon: Ticket,
            label: 'Fans & students',
            title: 'Join the community',
            text: 'Guestlists, volunteer gigs and giveaways for shows near you. Free.',
            cta: authUser ? 'Join in one tap' : 'Sign in and join',
            onClick: () => run({ type: INTENTS.joinCommunity }, join),
        },
    ].filter(Boolean);

    if (!tiles.length) return null;

    return (
        <section aria-label="Ways in" className={cn('grid gap-3', tiles.length > 1 && 'sm:grid-cols-2')}>
            {tiles.map(({ key, ...t }) => <Tile key={key} {...t} busy={key === 'community' && busy} />)}
        </section>
    );
};

export default JoinPaths;
