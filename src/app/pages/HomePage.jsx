import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import UserRoundPen from 'lucide-react/dist/esm/icons/user-round-pen';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Zap from 'lucide-react/dist/esm/icons/zap';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Sticker from '../../components/brand/Sticker';
import { usePublicFeed } from '../usePublicFeed';
import { fromPrice, useTicketedEvents } from '../tickets/useTicketedEvents';
import { greetingFor } from './greeting';
import { useAppStore } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { Card, Button, WhatsAppBadge } from '../../components/app';
import { appPath } from '../host';
import { useAuthGate } from '../auth/AuthGate';
import { missingFields, fieldLabel } from '../profile/requirements';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import AccountBanner from '../auth/AccountBanner';
import JoinPaths from './JoinPaths';
import { useAppContent } from '../useAppContent';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { campaignCard, feedCard } from '../cards';
import { bySoonest, isUpcomingPass } from '../passes/passCards';
import PassTicket from '../passes/PassTicket';
import { PageBody } from './PageHeader';
import { SectionHeader, Rail, CardSkeleton, EmptyState, HeroPanel, GLASS } from './parts';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Clock from 'lucide-react/dist/esm/icons/clock';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import { useT } from '../../i18n';
import { useLocalizedCampaigns, useLocalizedFeed } from '../../i18n/useHinglish';

/*
 * Home, top to bottom:
 *   a greeting (time of day, your name, one warm line; your next pass when it's close)
 *   quick actions · the ways in (until you've done them) · finish your profile
 *   your passes · upcoming shows (tickets or the guestlist) and open campaigns
 *   (creators see campaigns first, everyone else upcoming first) · gigs,
 *   giveaways and forms in the community (guestlists are in Upcoming) ·
 *   the WhatsApp community.
 */

// Phone, email and name are asked by the account banner (auth/AccountBanner) above.
const ONBOARDING_FIELDS = ['city'];

// Creator things first, community after.
const QUICK = [
    { to: '/creator', icon: Zap, label: 'Campaigns' },
    { to: '/tickets', icon: Ticket, label: 'Tickets' },
    { to: '/community', icon: ListChecks, label: 'Guestlists' },
    { to: '/community', icon: Gift, label: 'Giveaways' },
];

const dayLabel = (day) => {
    const d = day ? new Date(`${day}T00:00:00`) : null;
    return d && !Number.isNaN(d.getTime()) ? format(d, 'EEE d MMM') : null;
};

/*
 * Upcoming shows for Home, soonest first: ticket sales (Tickets), the site's upcoming
 * events and guestlists, each only when "Where it shows → App home" is on in the admin.
 */
const useUpcomingShows = () => {
    const { events: ticketed, loaded } = useTicketedEvents();
    const feed = usePublicFeed();
    const community = useAppStore(s => s.communityFeed);
    return useMemo(() => {
        const byId = new Map();
        // An event card made from a guestlist is keyed by that list, so the two show once.
        (feed?.events || []).filter(e => e.showInApp !== false).forEach(e => byId.set(e.guestlistId || e.id, {
            id: e.guestlistId || e.id, title: e.title, image: e.image, day: e.date, time: e.time, venue: e.location, city: e.city,
            category: e.category, ticketed: e.isTicketed, guestlist: e.hasGuestlist,
        }));
        (community || []).filter(i => i.type === 'guestlist' && i.showInApp && i.date).forEach(i => {
            const day = i.date instanceof Date ? format(i.date, 'yyyy-MM-dd') : String(i.date).slice(0, 10);
            // The list's own details win over a copied event card (it has the time).
            byId.set(i.id, { ...(byId.get(i.id) || {}), id: i.id, title: i.title, image: i.image || byId.get(i.id)?.image, day, time: i.time || byId.get(i.id)?.time, venue: i.venue, city: i.city, guestlist: true });
        });
        (ticketed || []).filter(e => e.showInApp !== false).forEach(e => byId.set(e.id, {
            ...(byId.get(e.id) || {}),
            id: e.id, title: e.title, image: e.image || e.poster || null, day: e.day, time: e.time, venue: e.venue || e.location,
            city: e.city, category: e.category || e.performanceType, ticketed: true, price: fromPrice(e),
        }));
        const today = format(new Date(), 'yyyy-MM-dd');
        const list = [...byId.values()].filter(e => e.day && e.day >= today).sort((a, b) => String(a.day).localeCompare(String(b.day))).slice(0, 8);
        return { shows: list, loaded: loaded || Boolean(feed) };
    }, [ticketed, loaded, feed, community]);
};

const showCard = (e, t, from) => ({
    type: 'event',
    image: e.image || null,
    title: e.title,
    eyebrow: e.category || null,
    chips: [{ icon: MapPin, label: e.city }],
    meta: [
        { icon: CalendarDays, label: dayLabel(e.day) },
        { icon: Clock, label: isPresent(e.time) ? e.time : null },
    ],
    stats: [
        { label: e.ticketed ? t('Tickets') : t('Entry'), value: e.ticketed ? (e.price ? t('From ₹{price}', { price: Number(e.price).toLocaleString('en-IN') }) : t('On sale')) : e.guestlist ? t('Guestlist') : null, tone: 'accent' },
        { label: t('Venue'), value: e.venue },
    ],
    cta: e.ticketed || e.guestlist ? { label: e.ticketed ? t('Get tickets') : t('Get on the list') } : false,
    to: e.ticketed ? `${appPath('/tickets')}?event=${encodeURIComponent(e.id)}` : e.guestlist ? appPath(`/community/g/${e.id}`) : undefined,
    // A guestlist opens as a sheet over Home.
    linkState: !e.ticketed && e.guestlist && from ? { backgroundLocation: from } : undefined,
});

const HomePage = () => {
    const t = useT();
    useDynamicMeta({ page: 'app-home' });
    useAppContent();
    const location = useLocation();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const openCampaigns = useAppStore(s => s.openCampaigns);
    const campaigns = useLocalizedCampaigns(openCampaigns, { fields: ['title', 'reward', 'description'] });
    const campaignsLoaded = useAppStore(s => s.campaignsLoaded);
    const feed = useLocalizedFeed(useAppStore(s => s.communityFeed));
    const feedLoaded = useAppStore(s => s.communityFeedLoaded);
    const creator = useAppStore(s => s.creatorProfile);
    const { requestSignIn } = useAuthGate();
    const [completeOpen, setCompleteOpen] = useState(false);
    const passes = useAppStore(s => s.passes);
    const upcoming = useMemo(() => passes.filter(isUpcomingPass).sort(bySoonest).slice(0, 6), [passes]);

    const firstName = (profile?.name || authUser?.displayName || '').trim().split(/\s+/)[0];
    // Not while the account sheet is open: what's missing is asked after sign-in, not during it.
    const signingIn = useLegacyStore(s => s.isAuthOpen);
    const missing = authUser && profileLoaded && !signingIn ? missingFields(profile, ONBOARDING_FIELDS) : [];
    const joined = new Set(creator?.joinedCampaigns || []);
    const { shows, loaded: showsLoaded } = useUpcomingShows();
    // Guestlists live in Upcoming; the community rail is for gigs, giveaways and forms.
    const communityItems = useMemo(() => feed.filter(item => item.type !== 'guestlist'), [feed]);
    // Creators see campaigns first; everyone else sees what's on first.
    const isCreator = Boolean(creator) || Boolean(profile?.capabilities?.creator);
    const whatsapp = usePublicFeed()?.contact?.whatsappCommunity;

    const next = upcoming[0];
    const nextWhen = next?.event?.date ? new Date(next.event.date) : null;
    const greet = greetingFor({
        name: firstName,
        city: profile?.city || '',
        signedIn: Boolean(authUser),
        nextPass: next ? { title: next.event?.title || next.campaignTitle, when: nextWhen } : null,
    });

    const campaignsSection = (
        <section className="space-y-3">
            <SectionHeader title={t('Open campaigns')} to={appPath('/creator')} />
            {!campaignsLoaded ? (
                <Rail><CardSkeleton /><CardSkeleton /></Rail>
            ) : campaigns.length ? (
                <Rail>
                    {campaigns.slice(0, 6).map(c => <Card key={c.id} {...campaignCard(c, { applied: joined.has(c.id), from: location })} />)}
                </Rail>
            ) : (
                <EmptyState icon={Megaphone} title={t('No open campaigns right now')} message={t('New brand and event campaigns show up here first.')} />
            )}
        </section>
    );

    const upcomingSection = (!showsLoaded || shows.length > 0) && (
        <section className="space-y-3">
            <SectionHeader title={t('Upcoming')} to={appPath('/tickets')} />
            {!showsLoaded ? (
                <Rail><CardSkeleton /><CardSkeleton /></Rail>
            ) : (
                <Rail>{shows.map(e => <Card key={e.id} {...showCard(e, t, location)} />)}</Rail>
            )}
        </section>
    );

    return (
        <PageBody>
            {/* Signed in but missing a verified phone, an email or a name: one banner, after sign-in. */}
            <AccountBanner />

            {/* The greeting: today's date, hello and your name, and one line for right now. */}
            <HeroPanel
                eyebrow={format(new Date(), 'EEEE, d MMMM')}
                title={greet.name ? <>{greet.hello}, <Sticker subtle>{`${greet.name}.`}</Sticker></> : <>{greet.hello}<span className="text-emerald-600 dark:text-neon-green">.</span></>}
            >
                <p className="text-[16px] text-gray-700 dark:text-zinc-300 lg:text-[18px]">{greet.line}</p>
                {!authUser && (
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Button onClick={() => requestSignIn()}>{t('Sign in')}</Button>
                        <Button variant="secondary" to={appPath('/community')}>{t('Explore')}</Button>
                    </div>
                )}
            </HeroPanel>

            {/* Quick ways to the most-used places. */}
            <nav aria-label={t('Quick links')} className="grid grid-cols-4 gap-2 sm:gap-3">
                {QUICK.map(({ to, icon: Icon, label }) => (
                    <Link key={label} to={appPath(to)} className={cn('flex flex-col items-center gap-2 rounded-2xl px-1 py-3.5 text-center transition-transform active:scale-95', GLASS)}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green"><Icon size={19} /></span>
                        <span className="text-[12px] font-bold sm:text-[13px]">{t(label)}</span>
                    </Link>
                ))}
            </nav>

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
                        <span className="block text-[15px] font-bold">{t('Finish your profile')}</span>
                        <span className="block text-[13px] text-gray-600 dark:text-zinc-400">
                            {t('Add your {fields} once for every pass and application.', { fields: missing.map(f => fieldLabel(f).toLowerCase().replace(/^your /, '')).reduce((a, b) => t('{a} and {b}', { a, b })) })}
                        </span>
                    </span>
                </button>
            )}

            {upcoming.length > 0 && (
                <section className="space-y-3">
                    <SectionHeader title={upcoming.length === 1 ? t('Your pass') : t('Your passes')} />
                    <Rail>{upcoming.map(pass => <PassTicket key={pass.ref} pass={pass} from={location} />)}</Rail>
                </section>
            )}

            {isCreator ? <>{campaignsSection}{upcomingSection}</> : <>{upcomingSection}{campaignsSection}</>}

            {(!feedLoaded || communityItems.length > 0) && (
                <section className="space-y-3">
                    <SectionHeader title={t('In the community')} to={appPath('/community')} />
                    {!feedLoaded ? (
                        <Rail><CardSkeleton /><CardSkeleton /></Rail>
                    ) : (
                        <Rail>{communityItems.slice(0, 6).map(item => <Card key={item.key} {...feedCard(item, { from: location })} />)}</Rail>
                    )}
                </section>
            )}

            {isPresent(whatsapp) && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cn('flex items-center gap-4 rounded-[1.75rem] p-4', GLASS)}>
                    <WhatsAppBadge size={44} />
                    <span className="min-w-0 flex-1">
                        <span className="block font-heading text-[16px] font-extrabold tracking-[-0.02em]">{t('The Newbi WhatsApp community')}</span>
                        <span className="block text-[13px] text-gray-600 dark:text-zinc-400">{t('First word on drops, guestlists and giveaways.')}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-gray-400" />
                </a>
            )}

            <CompleteProfileSheet
                open={completeOpen}
                onClose={() => setCompleteOpen(false)}
                required={ONBOARDING_FIELDS}
                title={t('Finish your profile')}
            />
        </PageBody>
    );
};

export default HomePage;
