import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore, useCapability } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { Button } from '../../components/app';
import { appPath } from '../host';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Users from 'lucide-react/dist/esm/icons/users';
import { cn } from '../../lib/utils';
import { GLASS } from './parts';

/*
 * The ways into the app on Home: become a creator (campaigns) and join the
 * community (guestlists, gigs, giveaways), each until you've done it. Light
 * rows in one glass panel (icon, one line, one button), so Home isn't a stack
 * of big cards; the hero above is the only big panel.
 *
 * Applying opens the application in place (a sheet over Home). Joining the
 * community is one tap; signed-out visitors sign in first and the join
 * finishes when they come back.
 */

const Row = ({ icon: Icon, accent, title, text, action }) => (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 lg:py-0">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', accent ? 'bg-neon-green text-black shadow-[0_8px_24px_-10px_rgba(57,255,20,0.8)]' : 'bg-emerald-500/10 text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green')}>
            <Icon size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
            <p className="font-heading text-[16px] font-extrabold tracking-[-0.02em]">{title}</p>
            <p className="text-[13px] leading-snug text-gray-600 dark:text-zinc-400">{text}</p>
        </div>
        <div className="shrink-0">{action}</div>
    </div>
);

const JoinPaths = () => {
    const authUser = useAppStore(s => s.authUser);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const joinCommunity = useAppStore(s => s.joinCommunity);
    const isCreator = useCapability('creator');
    const isMember = useCapability('member');
    const { run } = useAuthGate();
    const location = useLocation();
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
            icon: Zap,
            accent: true,
            title: 'Become a Newbi creator',
            text: 'Passes, products and paid work for posting about shows.',
            action: <Button size="sm" to={appPath('/creator/apply')} state={{ backgroundLocation: location }}>Apply</Button>,
        },
        !isMember && {
            key: 'community',
            icon: Users,
            title: 'Join the community',
            text: 'Guestlists, gigs and giveaways near you. Free, one tap.',
            action: <Button size="sm" variant="secondary" loading={busy} onClick={() => run({ type: INTENTS.joinCommunity }, join)}>Join</Button>,
        },
    ].filter(Boolean);

    if (!tiles.length) return null;

    return (
        <section aria-label="Ways in" className={cn('rounded-[1.75rem] px-5 py-5 lg:grid lg:gap-8 lg:px-7', GLASS, tiles.length > 1 && 'divide-y divide-black/[0.06] dark:divide-white/[0.08] lg:grid-cols-2 lg:divide-y-0')}>
            {tiles.map(({ key, ...t }) => <Row key={key} {...t} />)}
        </section>
    );
};

export default JoinPaths;
