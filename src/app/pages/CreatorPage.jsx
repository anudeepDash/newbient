import React from 'react';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import { useAppStore, useCapability } from '../../lib/store/appStore';
import { isPresent } from '../../lib/present';
import { extractSocialUsername } from '../../lib/socialUtils';
import { Card, Button } from '../../components/app';
import { landingUrl } from '../host';
import { useAppContent } from '../useAppContent';
import { campaignCard } from '../cards';
import PageHeader, { PageBody } from './PageHeader';
import { CardGrid, CardSkeleton, EmptyState, HeroPanel, SectionHeader } from './parts';

/*
 * Creator home. Phase 4 moves the dashboard and the application in here
 * (Openings, Deliverables, Referrals, Profile, with campaign tickets inside
 * each campaign). For now: your status, the open campaigns, and links to the
 * current dashboard and application.
 */

const STATUS = {
    approved: { label: 'Approved', tone: 'text-emerald-700 bg-emerald-500/10 dark:text-neon-green dark:bg-neon-green/10' },
    pending: { label: 'In review', tone: 'text-amber-700 bg-amber-500/10 dark:text-amber-300' },
    pending_verification: { label: 'Verifying', tone: 'text-amber-700 bg-amber-500/10 dark:text-amber-300' },
    rejected: { label: 'Not approved', tone: 'text-red-700 bg-red-500/10 dark:text-red-400' },
};

const compact = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : String(v);
};

const CreatorStatus = ({ creator }) => {
    const username = creator?.instagram ? extractSocialUsername(creator.instagram, 'instagram') : null;
    const photo = creator?.profilePicture || creator?.instagramProfilePic || creator?.photoURL;
    const name = creator?.name || creator?.displayName;
    const status = STATUS[creator?.profileStatus];
    const followers = compact(creator?.instagramFollowers);
    return (
        <HeroPanel image={photo} eyebrow="Creator" title={name || 'Your creator profile'}>
            <div className="flex flex-wrap items-center gap-2">
                {status && <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${status.tone}`}>{status.label}</span>}
                {isPresent(username) && (
                    <span className="flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-[13px] font-semibold text-gray-700 dark:bg-white/[0.07] dark:text-zinc-300">
                        <Instagram size={13} /> @{username}{followers ? ` · ${followers}` : ''}
                    </span>
                )}
            </div>
            <div className="pt-1">
                <Button href={landingUrl('/creator-dashboard')} icon={ArrowUpRight}>Open dashboard</Button>
            </div>
        </HeroPanel>
    );
};

const CreatorPage = () => {
    useAppContent({ feed: false });
    const isCreator = useCapability('creator');
    const creator = useAppStore(s => s.creatorProfile);
    const creatorLoaded = useAppStore(s => s.creatorLoaded);
    const campaigns = useAppStore(s => s.openCampaigns);
    const campaignsLoaded = useAppStore(s => s.campaignsLoaded);
    const joined = new Set(creator?.joinedCampaigns || []);

    return (
        <PageBody>
            {!creatorLoaded ? (
                <div className="h-48 animate-pulse rounded-[2rem] bg-black/[0.04] dark:bg-white/[0.04]" />
            ) : isCreator ? (
                <CreatorStatus creator={creator} />
            ) : (
                <>
                    <PageHeader eyebrow="Creators" title="Become a Newbi creator" />
                    <HeroPanel image={campaigns[0]?.thumbnail} title="Get passes, products and paid work for posting about the shows you love.">
                        <p className="text-[15px] text-gray-600 dark:text-zinc-300">Share your Instagram, niche and rates. Approved creators get invited to campaigns from brands and events.</p>
                        <div className="pt-1">
                            <Button href={landingUrl('/creator/join')}>Apply as a creator</Button>
                        </div>
                    </HeroPanel>
                </>
            )}

            <section className="space-y-3">
                <SectionHeader title="Open campaigns" />
                {!campaignsLoaded ? (
                    <CardGrid><CardSkeleton /><CardSkeleton /></CardGrid>
                ) : campaigns.length ? (
                    <CardGrid>
                        {campaigns.map(c => <Card key={c.id} {...campaignCard(c, { applied: joined.has(c.id) })} />)}
                    </CardGrid>
                ) : (
                    <EmptyState icon={Megaphone} title="No open campaigns right now" message="New brand and event campaigns show up here first." />
                )}
            </section>
        </PageBody>
    );
};

export default CreatorPage;
