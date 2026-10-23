import React, { useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Clock from 'lucide-react/dist/esm/icons/clock';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Timer from 'lucide-react/dist/esm/icons/timer';
import DoorOpen from 'lucide-react/dist/esm/icons/door-open';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Languages from 'lucide-react/dist/esm/icons/languages';
import Armchair from 'lucide-react/dist/esm/icons/armchair';
import Trees from 'lucide-react/dist/esm/icons/trees';
import Baby from 'lucide-react/dist/esm/icons/baby';
import Dog from 'lucide-react/dist/esm/icons/dog';
import Accessibility from 'lucide-react/dist/esm/icons/accessibility';
import CircleParking from 'lucide-react/dist/esm/icons/circle-parking';
import Shirt from 'lucide-react/dist/esm/icons/shirt';
import Info from 'lucide-react/dist/esm/icons/info';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Check from 'lucide-react/dist/esm/icons/check';
import Navigation from 'lucide-react/dist/esm/icons/navigation';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import { Button, CARD_TYPES, Field, Section, Stat, StatRow } from '../../components/app';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';
import { eventSaleState, eventTiers } from '../../lib/ticketing';
import { eventVenueMap } from '../../lib/venueMap';
import VenueMapView from '../../components/venue/VenueMapView';
import { useAppStore } from '../../lib/store/appStore';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useT } from '../../i18n';
import { appPath } from '../host';
import { useAuthGate, useResumeIntent } from '../auth/AuthGate';
import { ROW } from '../pages/DetailLayout';
import { ActionBar, BackButton, BarStatus, ExpandedHero, ExpandedMissing, ExpandedPage, ExpandedSkeleton, ExpandedTitle, useCloseExpanded } from '../pages/ExpandedCard';
import { Notice } from '../creator/ui';
import { shareLink } from '../community/communityParts';
import { isUpcomingPass } from '../passes/passCards';
import { fromPrice, useTicketEvent } from './useTicketedEvents';
import { dayLabel, directionsUrl, lineupOf, quickFacts, termsOf, timeRange, venueName } from './eventDetails';
import { useDarkMode } from './PickTickets';
import { rupees } from './ticketParts';
import TicketSheet from './TicketSheet';

/*
 * /tickets/:id: one show, as a card expanded, the same way campaigns,
 * guestlists, giveaways and forms open (ExpandedCard):
 *
 *   Over the Tickets list or Home (link state { backgroundLocation }): a
 *   sheet over the list. From a shared link: the card centred on its page.
 *
 * Top to bottom: the 16:9 banner with its colours glowing behind it, the
 * date and time, the title with price, age and duration tiles, then
 * details, ticket types (and the venue map), line-up, about, things to
 * know, FAQs and terms. The action bar ("Book tickets", Share) is pinned to
 * the bottom. Anything the admin didn't fill in isn't shown, and the quick
 * facts (age, duration, gates open, seating…) are hidden when the sale has
 * info.hideFacts set.
 *
 * Booking opens TicketSheet over the card (?book=1, so Back closes it;
 * ?tier=ID starts with that ticket type). Buying needs an account, so the
 * sign-in comes first and the sheet opens where you left off.
 */

const BOOK_INTENT = 'tickets-book';

const FACT_ICON = {
    duration: Timer, doors: DoorOpen, age: ShieldCheck, language: Languages, seating: Armchair, venueType: Trees,
    kids: Baby, pets: Dog, accessible: Accessibility, parking: CircleParking, dress: Shirt,
};
// Shown as stat tiles under the title, so the details list skips them.
const TILE_FACTS = ['age', 'duration'];

const ReadMore = ({ text }) => {
    const t = useT();
    const [open, setOpen] = useState(false);
    const long = text.length > 320;
    return (
        <div>
            <p className={cn('whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300', long && !open && 'line-clamp-5')}>{text}</p>
            {long && (
                <button type="button" onClick={() => setOpen(v => !v)} className="mt-1 h-10 text-[14px] font-bold text-emerald-700 dark:text-neon-green">
                    {open ? t('Show less') : t('Read more')}
                </button>
            )}
        </div>
    );
};

const Disclosure = ({ title, icon: Icon, children }) => (
    <details className="group border-b border-black/[0.05] last:border-0 dark:border-white/[0.06]">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
            {Icon && <Icon size={16} className="shrink-0 text-gray-500 dark:text-zinc-400" />}
            <span className="min-w-0 flex-1 text-[15px] font-bold">{title}</span>
            <ChevronDown size={18} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pb-4 text-[14px] leading-relaxed text-gray-600 dark:text-zinc-400">{children}</div>
    </details>
);

const EventPage = ({ overlay = false }) => {
    const t = useT();
    const { id } = useParams();
    const location = useLocation();
    const [params, setParams] = useSearchParams();
    const { event, loaded } = useTicketEvent(id);
    const passes = useAppStore(s => s.passes);
    const dark = useDarkMode();
    const gate = useAuthGate();
    const close = useCloseExpanded(appPath('/tickets'));

    useDynamicMeta({
        page: 'ticket-event',
        title: event?.title ? `${event.title}${event.city ? ` · ${event.city}` : ''}` : undefined,
        description: event?.description,
        image: event?.hubImage || event?.image,
    });

    const tiers = useMemo(() => (event ? eventTiers(event).filter(x => !x.hidden) : []), [event]);
    const map = useMemo(() => (event ? eventVenueMap(event) : null), [event]);
    const myPasses = useMemo(() => (passes || []).filter(p => p.event?.title === event?.title && p.source === 'order' && isUpcomingPass(p)), [passes, event?.title]);

    // The booking sheet lives in the address (?book=1); the link state keeps the card over its list.
    const bookOpen = params.get('book') === '1';
    const startTier = params.get('tier');
    const showBooking = (tierId) => {
        const next = new URLSearchParams(params);
        next.set('book', '1');
        if (tierId) next.set('tier', tierId); else next.delete('tier');
        setParams(next, { state: location.state });
    };
    const book = (tierId) => gate.run({ type: BOOK_INTENT, payload: { id, tier: tierId || null } }, () => showBooking(tierId), { require: ['name'] });
    useResumeIntent(BOOK_INTENT, (payload) => payload?.id === id && showBooking(payload.tier));
    const closeBooking = () => {
        const next = new URLSearchParams(params);
        next.delete('book');
        next.delete('tier');
        setParams(next, { replace: true, state: location.state });
    };

    const back = !overlay ? <BackButton to={appPath('/tickets')}>{t('Tickets')}</BackButton> : null;

    if (!event) {
        // In a fragment like the loaded page below, so the sheet stays put when the data arrives.
        return (
            <>
            <ExpandedPage
                overlay={overlay}
                onClose={close}
                back={back}
                label={t('Tickets')}
                body={loaded
                    ? <ExpandedMissing title={t('Show not found')} message={t('This show isn’t selling tickets any more, or the link is wrong.')} action={<Button variant="secondary" to={appPath('/tickets')}>{t('See what’s on')}</Button>} />
                    : <ExpandedSkeleton />}
            />
            </>
        );
    }

    const sale = eventSaleState(event);
    const price = fromPrice(event);
    const facts = event.info?.hideFacts ? [] : quickFacts(event);
    const factOf = (key) => facts.find(f => f.key === key)?.value || null;
    const detailFacts = facts.filter(f => !TILE_FACTS.includes(f.key));
    const lineup = lineupOf(event);
    const terms = termsOf(event);
    const things = (Array.isArray(event.thingsToKnow) ? event.thingsToKnow : []).filter(isPresent);
    const faqs = (Array.isArray(event.faqs) ? event.faqs : []).filter(f => isPresent(f?.q));
    const genres = (Array.isArray(event.genres) ? event.genres : []).filter(isPresent);
    const banner = event.hubImage || event.image || event.poster;
    const venue = venueName(event);
    const directions = directionsUrl(event);
    const time = timeRange(event);
    const opens = sale.opensAt ? sale.opensAt.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    const KindIcon = CARD_TYPES.event.icon;

    const share = () => shareLink({ title: event.title, text: [event.title, dayLabel(event), venue].filter(Boolean).join(' · '), url: window.location.href.split('?')[0] });

    const statusChip = sale.state === 'upcoming' ? t('Soon') : sale.state === 'paused' ? t('Paused') : sale.state === 'closed' ? t('Ended') : null;
    const action = sale.state === 'open'
        ? <Button className="flex-1" size="lg" icon={Ticket} onClick={() => book()}>{price ? t('Book tickets · from {price}', { price: rupees(price) }) : t('Book tickets')}</Button>
        : sale.state === 'upcoming'
            ? <BarStatus icon={Hourglass} tone="warn">{t('Tickets go on sale {when}.', { when: opens })}</BarStatus>
            : sale.state === 'paused'
                ? <BarStatus icon={Hourglass} tone="warn">{t('Sales are paused. Check back soon.')}</BarStatus>
                : <BarStatus icon={Clock}>{t('Ticket sales have ended.')}</BarStatus>;
    const bar = <ActionBar onShare={share} shareLabel="Share show">{action}</ActionBar>;

    const hero = (
        <ExpandedHero
            image={banner}
            icon={KindIcon}
            chips={[
                { icon: MapPin, label: event.city },
                { label: statusChip, tone: 'warn' },
            ]}
        />
    );

    return (
        <>
            <ExpandedPage overlay={overlay} onClose={close} back={back} label={event.title} hero={hero} bar={bar}>
                <ExpandedTitle
                    meta={[{ icon: CalendarDays, label: dayLabel(event) }, { icon: Clock, label: time }]}
                    eyebrow={(isPresent(event.category) || genres.length > 0) && (
                        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{[event.category, ...genres].filter(isPresent).slice(0, 4).join(' · ')}</p>
                    )}
                    title={event.title}
                >
                    <StatRow>
                        <Stat label={t('Tickets')} value={price ? t('From {price}', { price: rupees(price) }) : tiers.length ? t('Free') : null} icon={IndianRupee} tone="accent" />
                        <Stat label={t('Age')} value={factOf('age')} icon={ShieldCheck} />
                        <Stat label={t('Duration')} value={factOf('duration')} icon={Timer} />
                    </StatRow>
                </ExpandedTitle>

                {myPasses.length > 0 && (
                    <Link to={appPath(`/p/${myPasses[0].ref}`)} className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-emerald-500/[0.08] px-4 py-3 text-[14px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-500/25 dark:bg-neon-green/[0.07] dark:text-neon-green dark:ring-neon-green/20">
                        <Check size={18} className="shrink-0" />
                        <span className="min-w-0 flex-1">{myPasses[0].status === 'pending' ? t('Your booking is being verified') : t('You have tickets for this show')}</span>
                        <ChevronRight size={18} className="shrink-0" />
                    </Link>
                )}
                {isPresent(event.ticketingDescription) && <Notice tone="info">{event.ticketingDescription}</Notice>}

                <Section title={t('Details')}>
                    <div className={`divide-y divide-black/[0.05] px-4 dark:divide-white/[0.06] ${ROW}`}>
                        <Field icon={CalendarDays} label={t('When')} value={[dayLabel(event, true), time].filter(isPresent).join(' · ')} />
                        <Field icon={MapPin} label={t('Venue')}>
                            {(venue || isPresent(event.venueAddress)) ? (
                                <>
                                    {venue && <span className="block">{venue}</span>}
                                    {[event.venueAddress, event.city].filter(isPresent).length > 0 && <span className="block text-[13.5px] font-medium text-gray-600 dark:text-zinc-400">{[event.venueAddress, event.city].filter(isPresent).join(', ')}</span>}
                                    {directions && (
                                        <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-[32px] items-center gap-1.5 text-[14px] font-bold text-emerald-700 dark:text-neon-green">
                                            <Navigation size={14} /> {t('Get directions')}
                                        </a>
                                    )}
                                </>
                            ) : t('To be announced{city}', { city: event.city ? ` · ${event.city}` : '' })}
                        </Field>
                        {detailFacts.map(f => <Field key={f.key} icon={FACT_ICON[f.key] || Info} label={t(f.label)} value={t(f.value)} />)}
                    </div>
                </Section>

                {tiers.length > 0 && (
                    <Section title={t('Tickets')}>
                        <div className="space-y-3">
                            {map && (
                                <button type="button" onClick={() => book()} disabled={sale.state !== 'open'} aria-label={t('Open the venue map to pick tickets')}
                                    className={cn('block w-full overflow-hidden text-left', ROW)}>
                                    <VenueMapView map={map} tiers={tiers} dark={dark} />
                                </button>
                            )}
                            <div className={`divide-y divide-black/[0.05] dark:divide-white/[0.06] ${ROW}`}>
                                {tiers.map(tier => (
                                    <button key={tier.id} type="button" onClick={() => book(tier.id)} disabled={sale.state !== 'open'}
                                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default">
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-[15px] font-bold">{tier.name}</span>
                                                {isPresent(tier.badge) && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">{t(tier.badge)}</span>}
                                            </span>
                                            {isPresent(tier.description) && <span className="mt-0.5 block text-[13px] text-gray-500 dark:text-zinc-400">{tier.description}</span>}
                                        </span>
                                        <span className="shrink-0 text-right">
                                            <span className="block text-[15px] font-black tabular-nums">{tier.price > 0 ? rupees(tier.price) : t('Free')}</span>
                                            {tier.originalPrice && <span className="block text-[12px] font-bold text-gray-400 line-through">{rupees(tier.originalPrice)}</span>}
                                        </span>
                                        {sale.state === 'open' && <ChevronRight size={18} className="shrink-0 text-gray-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Section>
                )}

                {lineup.length > 0 && (
                    <Section title={t('Line-up')}>
                        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {lineup.map((a, i) => {
                                const handle = String(a.instagram || '').replace(/^@/, '');
                                const ig = handle ? `https://instagram.com/${handle}` : null;
                                const Tag = ig ? 'a' : 'div';
                                return (
                                    <Tag key={`${a.name}-${i}`} {...(ig ? { href: ig, target: '_blank', rel: 'noopener noreferrer' } : {})} className="flex w-20 shrink-0 flex-col items-center gap-2 text-center">
                                        <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400/30 to-sky-400/30 text-[24px] font-black text-gray-700 ring-1 ring-black/[0.06] dark:text-zinc-200 dark:ring-white/[0.1]">
                                            {isPresent(a.image) ? <img src={a.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : a.name.slice(0, 1).toUpperCase()}
                                        </span>
                                        <span className="w-full">
                                            <span className="block truncate text-[13px] font-bold">{a.name}</span>
                                            {(isPresent(a.role) || ig) && <span className="flex items-center justify-center gap-1 truncate text-[11.5px] text-gray-500 dark:text-zinc-400">{ig && !a.role && <Instagram size={11} />}{a.role || `@${handle}`}</span>}
                                        </span>
                                    </Tag>
                                );
                            })}
                        </div>
                    </Section>
                )}

                {isPresent(event.description) && (
                    <Section title={t('About')}><ReadMore text={event.description} /></Section>
                )}

                {things.length > 0 && (
                    <Section title={t('Things to know')}>
                        <ul className={`space-y-2 px-4 py-3.5 ${ROW}`}>
                            {things.map((line, i) => (
                                <li key={i} className="flex gap-2.5 text-[14.5px] text-gray-700 dark:text-zinc-300"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-neon-green" /> {line}</li>
                            ))}
                        </ul>
                    </Section>
                )}

                {(faqs.length > 0 || terms.length > 0) && (
                    <Section title={faqs.length ? t('FAQs') : t('Terms')}>
                        <div className={`px-4 ${ROW}`}>
                            {faqs.map((f, i) => <Disclosure key={i} title={f.q}>{isPresent(f.a) && <p className="whitespace-pre-line">{f.a}</p>}</Disclosure>)}
                            {terms.length > 0 && (
                                <Disclosure title={t('Terms and conditions')} icon={ShieldCheck}>
                                    <ul className="list-disc space-y-1 pl-5">{terms.map((line, i) => <li key={i}>{line}</li>)}</ul>
                                </Disclosure>
                            )}
                        </div>
                    </Section>
                )}

                <p className="px-1 text-[12.5px] text-gray-500 dark:text-zinc-500">{t('Presented by {name}', { name: event.organizer || 'Newbi Entertainment' })} · {t('No booking fee')}</p>
            </ExpandedPage>

            <TicketSheet event={event} open={bookOpen} onClose={closeBooking} startTier={startTier} />
        </>
    );
};

export default EventPage;
