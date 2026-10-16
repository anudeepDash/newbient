import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore, useCapability } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { Button } from '../../components/app';
import { appPath } from '../host';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import { HeroPanel } from './parts';

/*
 * The ways into the app on Home: become a creator (campaigns) and join the
 * community (guestlists, gigs, giveaways), each until you've done it.
 * Both use the hero card from creator home: dark with the green
 * corner glow, dot texture and the faded "N." mark, one headline, one line
 * and one button.
 *
 * Applying opens the application in place (a sheet over Home). Joining the
 * community is one tap; signed-out visitors sign in first and the join
 * finishes when they come back.
 */

const Tile = ({ eyebrow, title, text, action }) => (
    <HeroPanel eyebrow={eyebrow} title={title} className="h-full">
        <p className="text-[15px] text-gray-600 dark:text-zinc-300">{text}</p>
        <div className="pt-1">{action}</div>
    </HeroPanel>
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
            eyebrow: 'Creators',
            title: 'Get passes, products and paid work for posting about the shows you love.',
            text: 'Add your Instagram and you’re done. Approved creators get invited to brand and event campaigns.',
            action: <Button to={appPath('/creator/apply')} state={{ backgroundLocation: location }}>Apply as a creator</Button>,
        },
        !isMember && {
            key: 'community',
            eyebrow: 'Fans & students',
            title: 'Guestlists, gigs and giveaways for shows near you.',
            text: 'Join the Newbi community. It’s free and takes one tap.',
            action: <Button loading={busy} onClick={() => run({ type: INTENTS.joinCommunity }, join)}>{authUser ? 'Join the community' : 'Sign in and join'}</Button>,
        },
    ].filter(Boolean);

    if (!tiles.length) return null;

    return (
        // One column on phones; side by side on desktop.
        <section aria-label="Ways in" className={`grid gap-3 lg:gap-6 ${tiles.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {tiles.map(({ key, ...t }) => <Tile key={key} {...t} />)}
        </section>
    );
};

export default JoinPaths;
