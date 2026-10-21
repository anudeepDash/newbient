import React, { useEffect, useMemo, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Coins from 'lucide-react/dist/esm/icons/coins';
import { useAppStore } from '../../../lib/store/appStore';
import { Card, Button } from '../../../components/app';
import { copyToClipboard } from '../../../lib/clipboard';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { appPath, stripAppBase } from '../../host';
import { useAppContent } from '../../useAppContent';
import useDynamicMeta from '../../../hooks/useDynamicMeta';
import { campaignCard } from '../../cards';
import { useT } from '../../../i18n';
import { useLocalizedCampaigns } from '../../../i18n/useHinglish';
import PageHeader, { PageBody } from '../../pages/PageHeader';
import { greetingFor } from '../../pages/greeting';
import { CardGrid, CardSkeleton, EmptyState, HeroPanel, SectionHeader } from '../../pages/parts';
import BrandLayers, { BRAND_GLASS } from '../../../components/app/BrandLayers';
import { cn } from '../../../lib/utils';
import { compactCount, creatorPassId, creatorPhoto, handleOf } from '../format';
import { Notice, StatusChip, SubTabs } from '../ui';
import { useMyCampaigns, useReferrals } from '../useCreatorData';
import OpeningsTab from './OpeningsTab';
import DeliverablesTab from './DeliverablesTab';
import ReferralsTab from './ReferralsTab';
import ReferBanner from './ReferBanner';
import CityGroupBanner from './CityGroupBanner';
import ProfileTab from './ProfileTab';
import MyOutreachCampaigns from './MyOutreachCampaigns';
import BadgesTab from '../badges/BadgesTab';
import BadgeUnlock from '../badges/BadgeUnlock';
import { BadgeShelf } from '../badges/BadgeParts';
import { useBadges } from '../badges/useBadges';

/*
 * /creator: creator home. Openings, Deliverables, Referrals, Badges and
 * Profile are sub-pages (/creator, /creator/deliverables, …); the shell's own tab bar is
 * the only bottom bar. Reads only creators/{uid}; referrals come from the
 * server. Points come from site_settings creatorWelcomePoints only, and the
 * Vault stays hidden until it exists.
 */

const SECTIONS = ['', 'deliverables', 'referrals', 'badges', 'profile'];

/*
 * The hero's numbers and the badge shelf: one row of same-height pills that
 * wraps on phones. Points get the coin and the green accent.
 */
const HeroStats = ({ stats, badges }) => {
    const t = useT();
    const shown = stats.filter(s => s.value !== null && s.value !== undefined && s.value !== '' && s.value !== 0);
    const earned = badges.some(b => b.earned);
    if (!shown.length && !earned) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {shown.map(s => {
                const points = s.kind === 'points';
                return (
                    <div
                        key={s.label}
                        className={points
                            ? 'flex h-12 items-center gap-2.5 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-white/90 to-emerald-50/80 pl-1.5 pr-3.5 dark:border-neon-green/15 dark:from-white/[0.06] dark:to-neon-green/[0.06]'
                            : 'flex h-12 flex-col justify-center rounded-2xl border border-black/[0.05] bg-white/75 px-3.5 dark:border-white/[0.07] dark:bg-white/[0.04]'}
                    >
                        {points && (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-green text-black shadow-[0_0_12px_rgba(57,255,20,0.4)]" aria-hidden="true">
                                <Coins size={16} strokeWidth={2.2} />
                            </span>
                        )}
                        <div className="flex flex-col">
                            <span className={'font-heading text-[17px] font-extrabold leading-none tracking-[-0.03em] tabular-nums ' + (s.tone === 'accent' ? 'text-emerald-600 dark:text-neon-green' : 'text-gray-900 dark:text-white')}>
                                {s.value}
                            </span>
                            <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">{t(s.label)}</span>
                        </div>
                    </div>
                );
            })}
            <BadgeShelf badges={badges} />
        </div>
    );
};

const CreatorHeader = ({ creator, profile, stats, badges }) => {
    const handle = handleOf(creator.instagram);
    const followers = compactCount(creator.instagramFollowers);
    const photo = creatorPhoto(creator, profile);
    const name = creator.name || creator.displayName || profile?.name;
    const passId = creatorPassId(creator);
    const addToast = useLegacyStore(s => s.addToast);
    const t = useT();
    // Home's time-of-day hello, with a line about their own work instead of the shows.
    const { hello } = greetingFor({ signedIn: true });
    const firstName = (name || '').trim().split(/\s+/)[0];
    const todo = stats.find(s => s.label === 'To do')?.value || 0;
    const line = todo === 1
        ? t('1 task waiting on you. Let’s get it done.')
        : todo > 1
            ? t('{n} tasks waiting on you. Let’s get them done.', { n: todo })
            : t('Fresh openings below. Pick one and start posting.');
    return (
        <section className={cn('rounded-[1.75rem] p-4 sm:p-5 lg:p-6', BRAND_GLASS)}>
            <BrandLayers mark="small" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                    {photo ? (
                        <img src={photo} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-neon-green/60 ring-offset-2 ring-offset-white dark:ring-offset-black sm:h-16 sm:w-16" />
                    ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neon-green font-heading text-[20px] font-extrabold text-black sm:h-16 sm:w-16 sm:text-[22px]" aria-hidden="true">
                            {(name || '?').trim().charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="min-w-0 space-y-1.5">
                        <h2 className="font-heading text-[21px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[26px]">
                            {hello}{firstName ? `, ${firstName}` : ''}<span className="text-emerald-600 dark:text-neon-green">.</span>
                        </h2>
                        <p className="text-[13.5px] leading-snug text-gray-600 dark:text-zinc-400">{line}</p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <StatusChip status={creator.profileStatus} />
                            {handle && (
                                <a
                                    href={`https://instagram.com/${handle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-7 items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 text-[12.5px] font-semibold text-gray-700 dark:bg-white/[0.07] dark:text-zinc-300"
                                >
                                    <Instagram size={13} /> @{handle}{followers ? ` · ${followers}` : ''}
                                </a>
                            )}
                            {passId && (
                                <button
                                    type="button"
                                    onClick={async () => { if (await copyToClipboard(passId)) addToast?.(t('Creator ID copied'), 'success'); }}
                                    className="flex h-7 items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 font-mono text-[11.5px] font-bold text-gray-600 dark:bg-white/[0.07] dark:text-zinc-400"
                                    aria-label={t('Copy creator ID {id}', { id: passId })}
                                >
                                    #{passId} <Copy size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <HeroStats stats={stats} badges={badges} />
            </div>
        </section>
    );
};

const StatusNotice = ({ creator, settings }) => {
    const t = useT();
    const status = creator.profileStatus;
    if (status === 'pending_verification') {
        return <Notice tone="info" title={t('Checking your Instagram')}>{t('We’ll confirm your followers with Instagram shortly. You can browse campaigns meanwhile.')}</Notice>;
    }
    if (status === 'pending' && settings?.metaVerification && creator.instagramVerifiedVia !== 'oauth') {
        return (
            <Notice
                tone="info"
                title={t('Get verified now')}
                action={<Button size="sm" variant="secondary" to={appPath('/creator/profile')}>{t('Connect Instagram')}</Button>}
            >
                {t('Connect your Instagram (a Creator or Business account) and you’re verified straight away, with no waiting for review.')}
            </Notice>
        );
    }
    if (status === 'pending') {
        return <Notice tone="info" title={t('Your profile is in review')}>{t('We check every profile by hand and will email you. You can browse and apply to campaigns meanwhile.')}</Notice>;
    }
    if (status === 'rejected' || status === 'suspended') {
        return <Notice tone="error" title={t('Your creator profile isn’t active')}>{t('Write to creators@newbi.live if you think this is a mistake.')}</Notice>;
    }
    if (settings?.metaVerification && creator.instagramVerifiedVia !== 'oauth') {
        return (
            <Notice
                tone="warn"
                title={t('Reconnect your Instagram')}
                action={<Button size="sm" variant="secondary" to={appPath('/creator/profile')}>{t('Connect Instagram')}</Button>}
            >
                {t('Connect with a Professional account to keep receiving campaign invites.')}
            </Notice>
        );
    }
    return null;
};

/* Not a creator yet: the pitch and the open campaigns. */
const BecomeCreator = () => {
    const t = useT();
    const location = useLocation();
    const openCampaigns = useAppStore(s => s.openCampaigns);
    const campaigns = useLocalizedCampaigns(openCampaigns, { fields: ['title', 'reward', 'description'] });
    const loaded = useAppStore(s => s.campaignsLoaded);
    return (
        <>
            <PageHeader eyebrow={t('Creators')} title={t('Become a Newbi')} highlight={t('creator.')} />
            <HeroPanel title={t('Get passes, products and paid work for posting about the shows you love.')}>
                <p className="text-[15px] text-gray-600 dark:text-zinc-300">{t('Add your Instagram, niche and rates. Approved creators get invited to campaigns from brands and events.')}</p>
                <div className="pt-1"><Button to={appPath('/creator/apply')} state={{ backgroundLocation: location }}>{t('Apply as a creator')}</Button></div>
            </HeroPanel>
            <section className="space-y-3">
                <SectionHeader title={t('Open campaigns')} />
                {!loaded ? (
                    <CardGrid><CardSkeleton /><CardSkeleton /></CardGrid>
                ) : campaigns.length ? (
                    <CardGrid>{campaigns.map(c => <Card key={c.id} {...campaignCard(c, { from: location })} />)}</CardGrid>
                ) : (
                    <EmptyState icon={Megaphone} title={t('No open campaigns right now')} message={t('New brand and event campaigns show up here first.')} />
                )}
            </section>
        </>
    );
};

const CreatorHome = () => {
    const t = useT();
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
    const badges = useBadges({ creator, profile, mine, referrals });

    useEffect(() => { loadCreatorSettings(); }, [loadCreatorSettings]);

    // Arriving on a section (a link to /creator/badges, or a tab tap) scrolls its
    // content up under the header instead of leaving it below the hero. Plain
    // /creator on first load stays at the top.
    const tabsRef = useRef(null);
    const shownSection = useRef(null);
    const ready = authReady && !(authUser && !creatorLoaded) && Boolean(creator);
    useEffect(() => {
        if (!ready || shownSection.current === section) return;
        const first = shownSection.current === null;
        if (first && section === '') { shownSection.current = section; return; }
        // Marked only once it has scrolled: sign-in can flip `ready` off and on,
        // and that cancels this run.
        // Instant: the shell has just jumped to the top, so the tab bar lands back
        // where it was rather than gliding down from there.
        const scroll = () => {
            shownSection.current = section;
            tabsRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
        };
        // A sheet (e.g. the badge unlock) pins the page and puts it back where it
        // was on close, so wait for it to close before scrolling.
        let observer = null;
        // After the shell's scroll-to-top for the new path.
        const timer = setTimeout(() => {
            if (document.body.style.position !== 'fixed') { scroll(); return; }
            observer = new MutationObserver(() => {
                if (document.body.style.position === 'fixed') return;
                observer.disconnect();
                observer = null;
                setTimeout(scroll);
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
        });
        return () => { clearTimeout(timer); observer?.disconnect(); };
    }, [ready, section]);

    const stats = useMemo(() => {
        const todo = mine.filter(m => m.shortlisted).reduce((n, m) => n + m.progress.todo, 0);
        const approved = mine.reduce((n, m) => n + m.progress.approved, 0);
        return [
            { label: 'Campaigns', value: mine.length || null },
            { label: 'To do', value: todo || null, tone: 'accent' },
            { label: 'Approved', value: approved || null },
            { label: 'Referrals', value: referrals?.list?.length || null },
            { label: 'Points', kind: 'points', value: creator?.profileStatus === 'approved' && settings?.welcomePoints ? settings.welcomePoints.toLocaleString('en-IN') : null },
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
        { to: appPath('/creator'), label: t('Openings'), end: true },
        { to: appPath('/creator/deliverables'), label: t('Deliverables'), count: mine.length || null },
        { to: appPath('/creator/referrals'), label: t('Referrals'), count: referrals?.list?.length || null },
        { to: appPath('/creator/badges'), label: t('Badges'), count: badges.filter(b => b.earned).length || null },
        { to: appPath('/creator/profile'), label: t('Profile') },
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
                    <CreatorHeader creator={creator} profile={profile} stats={stats} badges={badges} />
                    <StatusNotice creator={creator} settings={settings} />
                    <div ref={tabsRef} className="scroll-mt-[calc(4.25rem+env(safe-area-inset-top))] lg:scroll-mt-[5.5rem]">
                        <SubTabs tabs={tabs} />
                    </div>
                    {/* Openings first; the community and referral prompts sit under them. */}
                    {section === '' && <OpeningsTab creator={creator} />}
                    {section === '' && <CityGroupBanner creator={creator} profile={profile} />}
                    {section === '' && <ReferBanner creator={creator} referrals={referrals} />}
                    {section === 'deliverables' && <DeliverablesTab mine={mine} />}
                    {section === 'referrals' && <ReferralsTab creator={creator} referrals={referrals} />}
                    {section === 'badges' && <BadgesTab badges={badges} />}
                    {section === 'profile' && <ProfileTab creator={creator} profile={profile} settings={settings} />}
                    <BadgeUnlock uid={authUser?.uid || creator.uid} badges={badges} ready={Boolean(referrals)} />
                </>
            )}
        </PageBody>
    );
};

export default CreatorHome;

