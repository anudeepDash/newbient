import React, { useState } from 'react';
import UserRoundPen from 'lucide-react/dist/esm/icons/user-round-pen';
import { useAppStore, useCapability } from '../../lib/store/appStore';
import { Card, Button, AmbientBackdrop } from '../../components/app';
import { appPath } from '../host';
import { useAuthGate } from '../auth/AuthGate';
import { missingFields, fieldLabel } from '../profile/requirements';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import PageHeader, { PageBody } from './PageHeader';

/*
 * Home: what's next for you. Phase 1 is the frame: greeting, onboarding prompt
 * and entry points. The upcoming pass, open campaigns, gigs and giveaways fill
 * in with Phases 4 and 5.
 */

const ONBOARDING_FIELDS = ['name', 'phoneVerified', 'city'];

const HomePage = () => {
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const isCreator = useCapability('creator');
    const { requestSignIn } = useAuthGate();
    const [completeOpen, setCompleteOpen] = useState(false);

    const firstName = (profile?.name || authUser?.displayName || '').trim().split(/\s+/)[0];
    const missing = authUser && profileLoaded ? missingFields(profile, ONBOARDING_FIELDS) : [];

    return (
        <PageBody>
            <PageHeader
                eyebrow={authUser ? 'Welcome back' : 'Newbi'}
                title={firstName ? `Hi, ${firstName}` : 'Welcome to Newbi'}
                subtitle="Guestlists, gigs, giveaways and creator campaigns, in one place."
            />

            {!authUser && (
                <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-6 dark:border-white/[0.07] dark:bg-[#0c0e14]">
                    <AmbientBackdrop />
                    <div className="relative space-y-3">
                        <h2 className="text-xl font-black tracking-tight">One account for everything Newbi</h2>
                        <p className="text-[15px] text-gray-600 dark:text-zinc-400">Sign in once to get passes, enter giveaways and apply to campaigns without filling the same details again.</p>
                        <Button onClick={() => requestSignIn()}>Sign in</Button>
                    </div>
                </div>
            )}

            {missing.length > 0 && (
                <div className="flex flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 sm:flex-row sm:items-center dark:border-neon-green/20 dark:bg-neon-green/[0.05]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:bg-neon-green/15 dark:text-neon-green">
                        <UserRoundPen size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-bold">Finish your profile</p>
                        <p className="text-[14px] text-gray-600 dark:text-zinc-400">
                            Add your {missing.map(f => fieldLabel(f).toLowerCase()).join(', ')} once, and every pass and application uses it.
                        </p>
                    </div>
                    <Button variant="secondary" onClick={() => setCompleteOpen(true)}>Add details</Button>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Card
                    type="guestlist"
                    eyebrow="Community"
                    title="Guestlists, gigs and giveaways"
                    description="Get on the guestlist for Newbi nights, pick up gigs and enter giveaways."
                    cta={{ label: 'Open Community' }}
                    to={appPath('/community')}
                />
                <Card
                    type="campaign"
                    eyebrow="Creators"
                    title={isCreator ? 'Your campaigns' : 'Become a Newbi creator'}
                    description={isCreator
                        ? 'Open campaigns, your deliverables and the tickets that come with them.'
                        : 'Work with brands on paid and barter campaigns. Apply with your Instagram.'}
                    cta={{ label: isCreator ? 'Open Creator' : 'See how it works' }}
                    to={appPath('/creator')}
                />
            </div>

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
