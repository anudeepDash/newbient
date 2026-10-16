import React, { useMemo, useState } from 'react';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Users from 'lucide-react/dist/esm/icons/users';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../lib/store/appStore';
import { guestlistPasses } from '../../lib/store/passes';
import { Card, Button, CARD_TYPES } from '../../components/app';
import { useAuthGate } from '../auth/AuthGate';
import { useAppContent } from '../useAppContent';
import { feedCard } from '../cards';
import PageHeader, { PageBody } from './PageHeader';
import { CardGrid, CardSkeleton, EmptyState, SectionHeader } from './parts';

/*
 * Community: one feed of cards (guestlists, gigs, giveaways, forms), filtered
 * by type, plus "My guestlists". Each card opens the current page for now;
 * Phase 5 brings guestlist pages and registration into the app.
 */

const FILTER_LABELS = { guestlist: 'Guestlists', gig: 'Gigs', giveaway: 'Giveaways', form: 'Forms' };

const CommunityPage = () => {
    useAppContent({ campaigns: false });
    const authUser = useAppStore(s => s.authUser);
    const feed = useAppStore(s => s.communityFeed);
    const loaded = useAppStore(s => s.communityFeedLoaded);
    const passes = useAppStore(s => s.passes);
    const myGuestlists = useMemo(() => guestlistPasses(passes), [passes]);
    const { requestSignIn } = useAuthGate();
    const [filter, setFilter] = useState('all');

    const types = useMemo(() => Object.keys(FILTER_LABELS).filter(t => feed.some(i => i.type === t)), [feed]);
    const shown = useMemo(() => (filter === 'all' ? feed : feed.filter(i => i.type === filter)), [feed, filter]);

    return (
        <PageBody>
            <PageHeader eyebrow="Community" title="What’s on" subtitle="Guestlists, gigs, giveaways and forms from Newbi." />

            {myGuestlists.length > 0 && (
                <section className="space-y-3">
                    <SectionHeader title="My guestlists" />
                    <CardGrid>
                        {myGuestlists.map(pass => (
                            <Card
                                key={pass.ref}
                                type="guestlist"
                                title={pass.eventTitle || pass.title}
                                chips={[{ icon: Ticket, label: pass.tier }]}
                                stats={[
                                    { label: 'Qty', value: pass.qty },
                                    { label: 'Status', value: pass.status === 'checked_in' ? 'Checked in' : pass.status === 'issued' ? 'Ready' : null, tone: 'accent' },
                                ]}
                                cta={{ label: 'Open pass' }}
                            />
                        ))}
                    </CardGrid>
                </section>
            )}

            {types.length > 1 && (
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                    {['all', ...types].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setFilter(t)}
                            className={cn(
                                'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-bold transition-colors',
                                filter === t
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                                    : 'border border-black/[0.08] bg-white text-gray-600 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-zinc-300'
                            )}
                        >
                            {t !== 'all' && React.createElement(CARD_TYPES[t].icon, { size: 15 })}
                            {t === 'all' ? 'All' : FILTER_LABELS[t]}
                        </button>
                    ))}
                </div>
            )}

            {!loaded ? (
                <CardGrid><CardSkeleton /><CardSkeleton /><CardSkeleton /></CardGrid>
            ) : shown.length ? (
                <CardGrid>{shown.map(item => <Card key={item.key} {...feedCard(item)} />)}</CardGrid>
            ) : (
                <EmptyState
                    icon={Users}
                    title="Nothing open right now"
                    message={authUser
                        ? 'New guestlists, gigs and giveaways show up here as soon as they open.'
                        : 'Sign in to see guestlists. New gigs and giveaways show up here as soon as they open.'}
                    action={!authUser && <Button className="mt-1" onClick={() => requestSignIn()}>Sign in</Button>}
                />
            )}

            {loaded && shown.length > 0 && !authUser && (
                <p className="px-1 text-[14px] text-gray-500 dark:text-zinc-400">
                    <button type="button" className="font-bold text-emerald-700 underline-offset-2 hover:underline dark:text-neon-green" onClick={() => requestSignIn()}>Sign in</button> to see guestlists too.
                </p>
            )}
        </PageBody>
    );
};

export default CommunityPage;
