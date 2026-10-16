import React from 'react';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import { useAppStore, useCapability } from '../../lib/store/appStore';
import { Card } from '../../components/app';
import { extractSocialUsername } from '../../lib/socialUtils';
import { landingUrl } from '../host';
import PageHeader, { PageBody } from './PageHeader';

/*
 * Creator home. Phase 4 moves the dashboard and the application in here
 * (Openings, Deliverables, Referrals, Profile, with campaign tickets inside
 * each campaign). Until then it links to the current pages.
 */

const STATUS_LABELS = { approved: 'Approved', pending: 'In review', pending_verification: 'Verifying', rejected: 'Not approved' };

const followerLabel = (n) => {
    const count = Number(n);
    if (!Number.isFinite(count) || count <= 0) return null;
    return count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K` : String(count);
};

const CreatorPage = () => {
    const isCreator = useCapability('creator');
    const creator = useAppStore(s => s.creatorProfile);
    const loaded = useAppStore(s => s.creatorLoaded);

    if (!loaded) {
        return <PageBody><div className="aspect-video max-w-xl animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" /></PageBody>;
    }

    if (!isCreator) {
        return (
            <PageBody>
                <PageHeader eyebrow="Creators" title="Become a Newbi creator" subtitle="Paid and barter campaigns with brands and events, matched to your city and niche." />
                <div className="max-w-xl">
                    <Card
                        type="campaign"
                        title="Apply with your Instagram"
                        description="Share your Instagram, niche and rates. Approved creators get invited to campaigns from brands and events."
                        cta={{ label: 'Start application' }}
                        href={landingUrl('/creator/join')}
                    />
                </div>
            </PageBody>
        );
    }

    const username = creator?.instagram ? extractSocialUsername(creator.instagram, 'instagram') : null;
    const handle = username ? `@${username}` : null;
    return (
        <PageBody>
            <PageHeader eyebrow="Creator" title="Your campaigns" subtitle="Openings, deliverables and your tickets for each campaign." />
            <div className="max-w-xl">
                <Card
                    type="campaign"
                    image={creator?.profilePicture || creator?.instagramProfilePic || creator?.photoURL}
                    eyebrow={handle}
                    title={creator?.name || creator?.displayName || 'Creator dashboard'}
                    chips={[{ icon: MapPin, label: creator?.city }]}
                    stats={[
                        { label: 'Status', value: STATUS_LABELS[creator?.profileStatus], tone: 'accent' },
                        { label: 'Followers', value: followerLabel(creator?.instagramFollowers), icon: Instagram },
                        { label: 'Campaigns', value: (creator?.joinedCampaigns || []).length || null },
                    ]}
                    cta={{ label: 'Open dashboard' }}
                    href={landingUrl('/creator-dashboard')}
                />
            </div>
        </PageBody>
    );
};

export default CreatorPage;
