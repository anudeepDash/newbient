import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import UserRoundPen from 'lucide-react/dist/esm/icons/user-round-pen';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import { useAppStore } from '../../lib/store/appStore';
import { Card, Button } from '../../components/app';
import { appPath } from '../host';
import { useAuthGate } from '../auth/AuthGate';
import { missingFields, fieldLabel } from '../profile/requirements';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import JoinPaths from './JoinPaths';
import { useAppContent } from '../useAppContent';
import { campaignCard, feedCard } from '../cards';
import { bySoonest, isUpcomingPass, passCard } from '../passes/passCards';
import { PageBody } from './PageHeader';
import { SectionHeader, Rail, CardSkeleton, EmptyState, HeroPanel } from './parts';

/*
 * Home: what's next for you. Open campaigns and what's on in the community,
 * plus a prompt to finish your profile and your upcoming passes (guestlist
 * passes and campaign tickets), soonest first.
 */

const ONBOARDING_FIELDS = ['name', 'phoneVerified', 'city'];

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const HomePage = () => {
    useAppContent();
    const location = useLocation();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const campaigns = useAppStore(s => s.openCampaigns);
    const campaignsLoaded = useAppStore(s => s.campaignsLoaded);
    const feed = useAppStore(s => s.communityFeed);
    const feedLoaded = useAppStore(s => s.communityFeedLoaded);
    const creator = useAppStore(s => s.creatorProfile);
    const { requestSignIn } = useAuthGate();
    const [completeOpen, setCompleteOpen] = useState(false);
    const passes = useAppStore(s => s.passes);
    const upcoming = useMemo(() => passes.filter(isUpcomingPass).sort(bySoonest).slice(0, 6), [passes]);

    const firstName = (profile?.name || authUser?.displayName || '').trim().split(/\s+/)[0];
    const missing = authUser && profileLoaded ? missingFields(profile, ONBOARDING_FIELDS) : [];
    const joined = new Set(creator?.joinedCampaigns || []);

    return (
        <PageBody>
            {authUser ? (
                <header>
                    <p className="text-[14px] font-semibold text-gray-500 dark:text-zinc-400">{greeting()}</p>
                    <h1 className="font-heading text-[30px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[34px] lg:text-[48px]">{firstName ? `Hi, ${firstName}` : 'Welcome back'}</h1>
                </header>
            ) : (
                <HeroPanel eyebrow="Newbi" title="Concerts, campaigns and the community, in one place.">
                    <p className="text-[15px] text-gray-600 dark:text-zinc-300">Get on guestlists, enter giveaways and apply to creator campaigns with one account.</p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Button onClick={() => requestSignIn()}>Sign in</Button>
                        <Button variant="secondary" to={appPath('/community')}>Explore</Button>
                    </div>
                </HeroPanel>
            )}

            <JoinPaths />

            {missing.length > 0 && (
                <button
                    type="button"
                    onClick={() => setCompleteOpen(true)}
                    className="flex w-full items-center gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 text-left transition-colors active:bg-emerald-500/[0.12] dark:border-neon-green/20 dark:bg-neon-green/[0.06]"
                >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:bg-neon-green/15 dark:text-neon-green">
                        <UserRoundPen size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold">Finish your profile</span>
                        <span className="block text-[13px] text-gray-600 dark:text-zinc-400">
                            Add your {missing.map(f => fieldLabel(f).toLowerCase()).join(', ')} once for every pass and application.
                        </span>
                    </span>
                </button>
            )}

            {upcoming.length > 0 && (
                <section className="space-y-3">
                    <SectionHeader title={upcoming.length === 1 ? 'Your pass' : 'Your passes'} />
                    <Rail>{upcoming.map(pass => <Card key={pass.ref} {...passCard(pass)} />)}</Rail>
                </section>
            )}

            <section className="space-y-3">
                <SectionHeader title="Open campaigns" to={appPath('/creator')} />
                {!campaignsLoaded ? (
                    <Rail><CardSkeleton /><CardSkeleton /></Rail>
                ) : campaigns.length ? (
                    <Rail>
                        {campaigns.slice(0, 6).map(c => <Card key={c.id} {...campaignCard(c, { applied: joined.has(c.id), from: location })} />)}
                    </Rail>
                ) : (
                    <EmptyState icon={Megaphone} title="No open campaigns right now" message="New brand and event campaigns show up here first." />
                )}
            </section>

            {(!feedLoaded || feed.length > 0) && (
                <section className="space-y-3">
                    <SectionHeader title="In the community" to={appPath('/community')} />
                    {!feedLoaded ? (
                        <Rail><CardSkeleton /><CardSkeleton /></Rail>
                    ) : (
                        <Rail>{feed.slice(0, 6).map(item => <Card key={item.key} {...feedCard(item)} />)}</Rail>
                    )}
                </section>
            )}

            <CompleteProfileSheet
                open={completeOpen}
                onClose={() => setCompleteOpen(false)}
                required={ONBOARDING_FIELDS}
                title="Finish your profile"
            />
        </PageBody>
    );
};

export default HomePage;
