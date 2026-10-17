import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import UserRoundPen from 'lucide-react/dist/esm/icons/user-round-pen';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Zap from 'lucide-react/dist/esm/icons/zap';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Sticker from '../../components/brand/Sticker';
import { usePublicFeed } from '../usePublicFeed';
import { fromPrice, useTicketedEvents } from '../tickets/useTicketedEvents';
import { greetingFor } from './greeting';
import { useAppStore } from '../../lib/store/appStore';
import { Card, Button } from '../../components/app';
import { appPath } from '../host';
import { useAuthGate } from '../auth/AuthGate';
import { missingFields, fieldLabel } from '../profile/requirements';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import JoinPaths from './JoinPaths';
import { useAppContent } from '../useAppContent';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { campaignCard, feedCard } from '../cards';
import { bySoonest, isUpcomingPass, passCard } from '../passes/passCards';
import { PageBody } from './PageHeader';
import { SectionHeader, Rail, CardSkeleton, EmptyState, HeroPanel, GLASS } from './parts';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Clock from 'lucide-react/dist/esm/icons/clock';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';

/*
 * Home, top to bottom:
 *   a greeting (time of day, your name, one warm line; your next pass when it's close)
 *   quick actions · the ways in (until you've done them) · finish your profile
 *   your passes · open campaigns · upcoming shows (tickets or the guestlist)
 *   what's on in the community · the WhatsApp community. Creator things come first.
 */

// The phone has its own banner (auth/PhoneBanner), so it isn't listed here.
const ONBOARDING_FIELDS = ['name', 'city'];

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
        (feed?.events || []).filter(e => e.showInApp !== false).forEach(e => byId.set(e.id, {
            id: e.id, title: e.title, image: e.image, day: e.date, time: e.time, venue: e.location, city: e.city,
            category: e.category, ticketed: e.isTicketed, guestlist: e.hasGuestlist,
        }));
        (community || []).filter(i => i.type === 'guestlist' && i.showInApp && i.date).forEach(i => {
            const day = i.date instanceof Date ? format(i.date, 'yyyy-MM-dd') : String(i.date).slice(0, 10);
            if (!byId.has(i.id)) byId.set(i.id, { id: i.id, title: i.title, image: i.image, day, venue: i.venue, city: i.city, guestlist: true });
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

const showCard = (e) => ({
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
        { label: e.ticketed ? 'Tickets' : 'Entry', value: e.ticketed ? (e.price ? `From ₹${Number(e.price).toLocaleString('en-IN')}` : 'On sale') : e.guestlist ? 'Guestlist' : null, tone: 'accent' },
        { label: 'Venue', value: e.venue },
    ],
    cta: e.ticketed || e.guestlist ? { label: e.ticketed ? 'Get tickets' : 'Get on the list' } : false,
    to: e.ticketed ? `${appPath('/tickets')}?event=${encodeURIComponent(e.id)}` : e.guestlist ? appPath(`/community/g/${e.id}`) : undefined,
});

const HomePage = () => {
    useDynamicMeta({ page: 'app-home' });
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
    const { shows, loaded: showsLoaded } = useUpcomingShows();
    const whatsapp = usePublicFeed()?.contact?.whatsappCommunity;

    const next = upcoming[0];
    const nextWhen = next?.event?.date ? new Date(next.event.date) : null;
    const greet = greetingFor({
        name: firstName,
        city: profile?.city || '',
        signedIn: Boolean(authUser),
        nextPass: next ? { title: next.event?.title || next.campaignTitle, when: nextWhen } : null,
    });

    return (
        <PageBody>
            {/* The greeting: today's date, hello and your name, and one line for right now. */}
            <HeroPanel
                eyebrow={format(new Date(), 'EEEE, d MMMM')}
                title={greet.name ? <>{greet.hello}, <Sticker subtle>{`${greet.name}.`}</Sticker></> : <>{greet.hello}<span className="text-emerald-600 dark:text-neon-green">.</span></>}
            >
                <p className="text-[16px] text-gray-700 dark:text-zinc-300 lg:text-[18px]">{greet.line}</p>
                {!authUser && (
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Button onClick={() => requestSignIn()}>Sign in</Button>
                        <Button variant="secondary" to={appPath('/community')}>Explore</Button>
                    </div>
                )}
            </HeroPanel>

            {/* Quick ways to the most-used places. */}
            <nav aria-label="Quick links" className="grid grid-cols-4 gap-2 sm:gap-3">
                {QUICK.map(({ to, icon: Icon, label }) => (
                    <Link key={label} to={appPath(to)} className={cn('flex flex-col items-center gap-2 rounded-2xl px-1 py-3.5 text-center transition-transform active:scale-95', GLASS)}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green"><Icon size={19} /></span>
                        <span className="text-[12px] font-bold sm:text-[13px]">{label}</span>
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
                        <span className="block text-[15px] font-bold">Finish your profile</span>
                        <span className="block text-[13px] text-gray-600 dark:text-zinc-400">
                            Add your {missing.map(f => fieldLabel(f).toLowerCase().replace(/^your /, '')).join(' and ')} once for every pass and application.
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

            {(!showsLoaded || shows.length > 0) && (
                <section className="space-y-3">
                    <SectionHeader title="Upcoming" to={appPath('/tickets')} />
                    {!showsLoaded ? (
                        <Rail><CardSkeleton /><CardSkeleton /></Rail>
                    ) : (
                        <Rail>{shows.map(e => <Card key={e.id} {...showCard(e)} />)}</Rail>
                    )}
                </section>
            )}

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

            {isPresent(whatsapp) && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cn('flex items-center gap-4 rounded-[1.75rem] p-4', GLASS)}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white"><MessageCircle size={20} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-heading text-[16px] font-extrabold tracking-[-0.02em]">The Newbi WhatsApp community</span>
                        <span className="block text-[13px] text-gray-600 dark:text-zinc-400">First word on drops, guestlists and giveaways.</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-gray-400" />
                </a>
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
