import React, { useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Copy from 'lucide-react/dist/esm/icons/copy';
import { useAppStore } from '../../../lib/store/appStore';
import { Card, Button, Stat, StatRow } from '../../../components/app';
import { copyToClipboard } from '../../../lib/clipboard';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { appPath, stripAppBase } from '../../host';
import { useAppContent } from '../../useAppContent';
import useDynamicMeta from '../../../hooks/useDynamicMeta';
import { campaignCard } from '../../cards';
import PageHeader, { PageBody } from '../../pages/PageHeader';
import { CardGrid, CardSkeleton, EmptyState, HeroPanel, SectionHeader } from '../../pages/parts';
import { compactCount, creatorPassId, creatorPhoto, handleOf } from '../format';
import { Notice, StatusChip, SubTabs } from '../ui';
import { useMyCampaigns, useReferrals } from '../useCreatorData';
import OpeningsTab from './OpeningsTab';
import DeliverablesTab from './DeliverablesTab';
import ReferralsTab from './ReferralsTab';
import ReferBanner from './ReferBanner';
import ProfileTab from './ProfileTab';
import MyOutreachCampaigns from './MyOutreachCampaigns';

/*
 * /creator: creator home. Openings, Deliverables, Referrals and Profile are
 * sub-pages (/creator, /creator/deliverables, …); the shell's own tab bar is
 * the only bottom bar. Reads only creators/{uid}; referrals come from the
 * server. Points come from site_settings creatorWelcomePoints only, and the
 * Vault stays hidden until it exists.
 */

const SECTIONS = ['', 'deliverables', 'referrals', 'profile'];

const CreatorHeader = ({ creator, profile, stats }) => {
    const handle = handleOf(creator.instagram);
    const followers = compactCount(creator.instagramFollowers);
    const photo = creatorPhoto(creator, profile);
    const name = creator.name || creator.displayName || profile?.name;
    const passId = creatorPassId(creator);
    const addToast = useLegacyStore(s => s.addToast);
    return (
        <HeroPanel eyebrow="Creator" title={name || 'Your creator profile'}>
            <div className="flex flex-wrap items-center gap-2">
                {photo && <img src={photo} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/70 dark:ring-white/10" />}
                <StatusChip status={creator.profileStatus} />
                {handle && (
                    <a
                        href={`https://instagram.com/${handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 items-center gap-1.5 rounded-full bg-black/[0.04] px-3 text-[13px] font-semibold text-gray-700 dark:bg-white/[0.07] dark:text-zinc-300"
                    >
                        <Instagram size={13} /> @{handle}{followers ? ` · ${followers}` : ''}
                    </a>
                )}
                {passId && (
                    <button
                        type="button"
                        onClick={async () => { if (await copyToClipboard(passId)) addToast?.('Creator ID copied', 'success'); }}
                        className="flex h-7 items-center gap-1.5 rounded-full bg-black/[0.04] px-3 font-mono text-[12px] font-bold text-gray-600 dark:bg-white/[0.07] dark:text-zinc-400"
                        aria-label={`Copy creator ID ${passId}`}
                    >
                        #{passId} <Copy size={12} />
                    </button>
                )}
            </div>
            <StatRow className="pt-2">
                {stats.map(s => <Stat key={s.label} {...s} className="bg-white/70 dark:bg-white/[0.04]" />)}
            </StatRow>
        </HeroPanel>
    );
};

const StatusNotice = ({ creator, settings }) => {
    const status = creator.profileStatus;
    if (status === 'pending_verification') {
        return <Notice tone="info" title="Checking your Instagram">We’ll confirm your followers with Instagram shortly. You can browse campaigns meanwhile.</Notice>;
    }
    if (status === 'pending' && settings?.metaVerification && creator.instagramVerifiedVia !== 'oauth') {
        return (
            <Notice
                tone="info"
                title="Get verified now"
                action={<Button size="sm" variant="secondary" to={appPath('/creator/profile')}>Connect Instagram</Button>}
            >
                Connect your Instagram (a Creator or Business account) and you’re verified straight away, with no waiting for review.
            </Notice>
        );
    }
    if (status === 'pending') {
        return <Notice tone="info" title="Your profile is in review">We check every profile by hand and will email you. You can browse and apply to campaigns meanwhile.</Notice>;
    }
    if (status === 'rejected' || status === 'suspended') {
        return <Notice tone="error" title="Your creator profile isn’t active">Write to creators@newbi.live if you think this is a mistake.</Notice>;
    }
    if (settings?.metaVerification && creator.instagramVerifiedVia !== 'oauth') {
        return (
            <Notice
                tone="warn"
                title="Reconnect your Instagram"
                action={<Button size="sm" variant="secondary" to={appPath('/creator/profile')}>Connect Instagram</Button>}
            >
                Connect with a Professional account to keep receiving campaign invites.
            </Notice>
        );
    }
    return null;
};

/* Not a creator yet: the pitch and the open campaigns. */
const BecomeCreator = () => {
    const location = useLocation();
    const campaigns = useAppStore(s => s.openCampaigns);
    const loaded = useAppStore(s => s.campaignsLoaded);
    return (
        <>
            <PageHeader eyebrow="Creators" title="Become a Newbi" highlight="creator." />
            <HeroPanel title="Get passes, products and paid work for posting about the shows you love.">
                <p className="text-[15px] text-gray-600 dark:text-zinc-300">Add your Instagram, niche and rates. Approved creators get invited to campaigns from brands and events.</p>
                <div className="pt-1"><Button to={appPath('/creator/apply')} state={{ backgroundLocation: location }}>Apply as a creator</Button></div>
            </HeroPanel>
            <section className="space-y-3">
                <SectionHeader title="Open campaigns" />
                {!loaded ? (
                    <CardGrid><CardSkeleton /><CardSkeleton /></CardGrid>
                ) : campaigns.length ? (
                    <CardGrid>{campaigns.map(c => <Card key={c.id} {...campaignCard(c, { from: location })} />)}</CardGrid>
                ) : (
                    <EmptyState icon={Megaphone} title="No open campaigns right now" message="New brand and event campaigns show up here first." />
                )}
            </section>
        </>
    );
};

const CreatorHome = () => {
    useDynamicMeta({ page: 'app-creator' });
    useAppContent({ feed: false });
    const location = useLocation();
    const section = stripAppBase(location.pathname).split('/')[2] || '';
    const authUser = useAppStore(s => s.authUser);
    const authReady = useAppStore(s => s.authReady);
    const profile = useAppStore(s => s.profile);
    const creator = useAppStore(s => s.creatorProfile);
    const creatorLoaded = useAppStore(s => s.creatorLoaded);
    const settings = useAppStore(s => s.creatorSettings);
    const loadCreatorSettings = useAppStore(s => s.loadCreatorSettings);
    const mine = useMyCampaigns(creator);
    const referrals = useReferrals(Boolean(creator));

    useEffect(() => { loadCreatorSettings(); }, [loadCreatorSettings]);

    const stats = useMemo(() => {
        const todo = mine.filter(m => m.shortlisted).reduce((n, m) => n + m.progress.todo, 0);
        const approved = mine.reduce((n, m) => n + m.progress.approved, 0);
        return [
            { label: 'Campaigns', value: mine.length || null },
            { label: 'To do', value: todo || null, tone: 'accent' },
            { label: 'Approved', value: approved || null },
            { label: 'Referrals', value: referrals?.list?.length || null },
            { label: 'Points', value: creator?.profileStatus === 'approved' && settings?.welcomePoints ? settings.welcomePoints.toLocaleString('en-IN') : null },
        ];
    }, [mine, referrals, settings, creator?.profileStatus]);

    // Old dashboard links: ?campaignId=… opens that campaign.
    const params = new URLSearchParams(location.search);
    const legacyCampaign = params.get('campaignId') || params.get('campaign');
    if (legacyCampaign) {
        params.delete('campaignId');
        params.delete('campaign');
        const q = params.toString();
        return <Navigate to={`${appPath(`/c/${encodeURIComponent(legacyCampaign)}`)}${q ? `?${q}` : ''}`} replace />;
    }
    if (!SECTIONS.includes(section)) return <Navigate to={appPath('/creator')} replace />;

    const loading = !authReady || (authUser && !creatorLoaded);
    const tabs = [
        { to: appPath('/creator'), label: 'Openings', end: true },
        { to: appPath('/creator/deliverables'), label: 'Deliverables', count: mine.length || null },
        { to: appPath('/creator/referrals'), label: 'Referrals', count: referrals?.list?.length || null },
        { to: appPath('/creator/profile'), label: 'Profile' },
    ];

    return (
        <PageBody>
            <MyOutreachCampaigns />
            {loading ? (
                <div className="h-48 animate-pulse rounded-[2rem] bg-black/[0.04] dark:bg-white/[0.04]" />
            ) : !creator ? (
                <BecomeCreator />
            ) : (
                <>
                    <CreatorHeader creator={creator} profile={profile} stats={stats} />
                    <StatusNotice creator={creator} settings={settings} />
                    <SubTabs tabs={tabs} />
                    {section === '' && <ReferBanner creator={creator} referrals={referrals} />}
                    {section === '' && <OpeningsTab creator={creator} />}
                    {section === 'deliverables' && <DeliverablesTab mine={mine} />}
                    {section === 'referrals' && <ReferralsTab creator={creator} referrals={referrals} />}
                    {section === 'profile' && <ProfileTab creator={creator} profile={profile} settings={settings} />}
                </>
            )}
        </PageBody>
    );
};

export default CreatorHome;

