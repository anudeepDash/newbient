import React, { useState } from 'react';
import UserRoundPen from 'lucide-react/dist/esm/icons/user-round-pen';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import { useAppStore, useCapability } from '../../lib/store/appStore';
import { Card, Button } from '../../components/app';
import { appPath } from '../host';
import { useAuthGate } from '../auth/AuthGate';
import { missingFields, fieldLabel } from '../profile/requirements';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { useAppContent } from '../useAppContent';
import { campaignCard, feedCard } from '../cards';
import { PageBody } from './PageHeader';
import { SectionHeader, Rail, CardSkeleton, EmptyState, HeroPanel } from './parts';

/*
 * Home: what's next for you. Open campaigns and what's on in the community,
 * plus a prompt to finish your profile. Upcoming passes join in Phase 5.
 */

const ONBOARDING_FIELDS = ['name', 'phoneVerified', 'city'];

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const HomePage = () => {
    useAppContent();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const campaigns = useAppStore(s => s.openCampaigns);
    const campaignsLoaded = useAppStore(s => s.campaignsLoaded);
    const feed = useAppStore(s => s.communityFeed);
    const feedLoaded = useAppStore(s => s.communityFeedLoaded);
    const creator = useAppStore(s => s.creatorProfile);
    const isCreator = useCapability('creator');
    const { requestSignIn } = useAuthGate();
    const [completeOpen, setCompleteOpen] = useState(false);

    const firstName = (profile?.name || authUser?.displayName || '').trim().split(/\s+/)[0];
    const missing = authUser && profileLoaded ? missingFields(profile, ONBOARDING_FIELDS) : [];
    const joined = new Set(creator?.joinedCampaigns || []);
    const heroImage = campaigns[0]?.thumbnail || feed.find(i => i.image)?.image || null;

    return (
        <PageBody>
            {authUser ? (
                <header>
                    <p className="text-[14px] font-semibold text-gray-500 dark:text-zinc-400">{greeting()}</p>
                    <h1 className="font-heading text-[30px] font-black leading-tight tracking-tight sm:text-[34px]">{firstName ? `Hi, ${firstName}` : 'Welcome back'}</h1>
                </header>
            ) : (
                <HeroPanel image={heroImage} eyebrow="Newbi" title="Concerts, campaigns and the community, in one app.">
                    <p className="text-[15px] text-gray-600 dark:text-zinc-300">Get on guestlists, enter giveaways and apply to creator campaigns with one account.</p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Button onClick={() => requestSignIn()}>Sign in</Button>
                        <Button variant="secondary" to={appPath('/community')}>Explore</Button>
                    </div>
                </HeroPanel>
            )}

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

            <section className="space-y-3">
                <SectionHeader title="Open campaigns" to={appPath('/creator')} />
                {!campaignsLoaded ? (
                    <Rail><CardSkeleton /><CardSkeleton /></Rail>
                ) : campaigns.length ? (
                    <Rail>
                        {campaigns.slice(0, 6).map(c => <Card key={c.id} {...campaignCard(c, { applied: joined.has(c.id) })} />)}
                    </Rail>
                ) : (
                    <EmptyState icon={Megaphone} title="No open campaigns right now" message="New brand and event campaigns show up here first." />
                )}
                {campaignsLoaded && campaigns.length > 0 && !isCreator && (
                    <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">Apply as a creator from the Creator tab to join these.</p>
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
