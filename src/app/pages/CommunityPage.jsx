import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Users from 'lucide-react/dist/esm/icons/users';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../lib/store/appStore';
import { guestlistPasses } from '../../lib/store/passes';
import { communityPost } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import { Card, Button, CARD_TYPES, Field, Section, Stat, StatRow, WhatsAppLogo } from '../../components/app';
import ExpandedCard, { ActionBar, BarStatus, ExpandedHero, ExpandedTitle } from './ExpandedCard';
import { ROW } from './DetailLayout';
import { Notice } from '../creator/ui';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import { useAppContent } from '../useAppContent';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { feedCard, dateLabel } from '../cards';
import { appPath } from '../host';
import { plainText, shareLink } from '../community/communityParts';
import { isUpcomingPass, passCard } from '../passes/passCards';
import PageHeader, { PageBody } from './PageHeader';
import { requirementsFor } from '../profile/requirements';
import JoinCommunitySheet from '../community/JoinCommunitySheet';
import { usePublicFeed } from '../usePublicFeed';
import WhatsAppGroupCard, { useJoinedGroups } from '../community/WhatsAppGroupCard';
import { CardGrid, CardSkeleton, EmptyState, SectionHeader, Rail, GLASS } from './parts';
import { useT } from '../../i18n';
import { useLocalizedFeed } from '../../i18n/useHinglish';

/*
 * Community: your guestlist passes, a one-tap Join, and one feed of cards
 * (guestlists, gigs, giveaways, forms) filtered by type and city. Past events
 * and closed forms drop off by date. Each card opens its page in the app;
 * gigs open a sheet with "I'm interested".
 */


/* "I'm interested" in a gig: saved in the app first, then a WhatsApp/link button. */
const GigSheet = ({ gig, onClose }) => {
    const t = useT();
    const gate = useAuthGate();
    const [state, setState] = useState('idle'); // idle | saving | saved
    const [error, setError] = useState('');
    useEffect(() => { setState('idle'); setError(''); }, [gig?.id]);

    const save = async () => {
        setState('saving');
        setError('');
        const res = await communityPost('gig-interest', { gigId: gig.id });
        if (res.ok) setState('saved');
        else { setState('idle'); setError(res.error); }
    };
    useResumeIntent(INTENTS.gigInterest, (payload) => { if (payload?.id === gig?.id) save(); });
    const interested = () => gate.run({ type: INTENTS.gigInterest, payload: { id: gig.id }, returnTo: `${appPath('/community')}?gig=${encodeURIComponent(gig.id)}` }, save, { require: requirementsFor('gig') });

    if (!gig) return null;
    const wa = gig.applyType === 'whatsapp' ? String(gig.applyLink || '').replace(/\D/g, '') : '';
    const next = gig.applyType === 'whatsapp'
        ? (wa ? { label: t('Message the team on WhatsApp'), icon: WhatsAppLogo, href: `https://wa.me/${wa}?text=${encodeURIComponent(`Hi! I'm interested in the gig: ${gig.title}`)}` } : null)
        : gig.applyType === 'form' ? { label: t('Fill the form'), to: gig.applyLink }
            : /^https?:\/\//.test(gig.applyLink || '') ? { label: t('Apply'), icon: ExternalLink, href: gig.applyLink } : null;
    const description = plainText(gig.description);

    const action = state === 'saved'
        ? (next
            ? <Button className="flex-1" size="lg" icon={next.icon} href={next.href} to={next.to} target={next.href ? '_blank' : undefined} rel={next.href ? 'noopener noreferrer' : undefined}>{next.label}</Button>
            : <BarStatus icon={CircleCheck} tone="success">{t('Saved. The team can see you’re interested.')}</BarStatus>)
        : <Button className="flex-1" size="lg" icon={HeartHandshake} loading={state === 'saving'} onClick={interested}>{t('I’m interested')}</Button>;
    const share = () => shareLink({ title: gig.title, url: `${window.location.origin}${appPath('/community')}?gig=${encodeURIComponent(gig.id)}` });

    return (
        <ExpandedCard
            overlay
            onClose={onClose}
            label={gig.title}
            hero={<ExpandedHero image={isPresent(gig.image) ? gig.image : null} icon={CARD_TYPES.gig.icon} chips={[{ icon: MapPin, label: gig.city }]} />}
            bar={<ActionBar onShare={share} shareLabel="Share gig">{action}</ActionBar>}
        >
            <ExpandedTitle meta={[{ icon: CalendarDays, label: dateLabel(gig.date) }]} eyebrow={<p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{t('Volunteer gig')}</p>} title={gig.title}>
                <StatRow>
                    <Stat label={t('Spots')} value={gig.slots || null} icon={Users} />
                </StatRow>
            </ExpandedTitle>
            {state === 'saved' && next && <Notice tone="success">{t('Saved. The team can see you’re interested.')}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            <Section title={t('Details')}>
                <div className={`divide-y divide-black/[0.05] px-4 dark:divide-white/[0.06] ${ROW}`}>
                    <Field icon={CalendarDays} label={t('When')} value={dateLabel(gig.date)} />
                    <Field icon={MapPin} label={t('Where')} value={[gig.venue, gig.city].filter(Boolean).join(', ') || null} />
                </div>
            </Section>
            <Section title={t('About')}>
                {description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{description}</p>}
            </Section>
        </ExpandedCard>
    );
};

/* One tap to join (sets capabilities.member). Replaces the old Google Form gate. */
const JoinPanel = () => {
    const t = useT();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const gate = useAuthGate();
    const [joinOpen, setJoinOpen] = useState(false);
    const member = Boolean(profile?.capabilities?.member);

    // Joining opens the welcome form; signed-out visitors sign in first.
    const join = () => setJoinOpen(true);
    useResumeIntent(INTENTS.joinCommunity, join);

    // Members get nothing here: the WhatsApp section below already links the group.
    if ((authUser && !profile) || member) return null;
    return (
        <div className={`flex flex-col gap-3 rounded-3xl px-5 py-5 sm:flex-row sm:items-center ${GLASS}`}>
            <div className="min-w-0 flex-1">
                <p className="font-heading text-[19px] font-extrabold tracking-[-0.02em]">{t('Join the Newbi community')}</p>
                <p className="text-[14px] text-gray-600 dark:text-zinc-400">{t('First word on guestlists, gigs and giveaways near you. Free.')}</p>
            </div>
            <Button onClick={() => gate.run({ type: INTENTS.joinCommunity }, join, { require: requirementsFor('community') })}>{t('Join')}</Button>
            <JoinCommunitySheet open={joinOpen} onClose={() => setJoinOpen(false)} />
        </div>
    );
};

/* The Newbi WhatsApp community. City creator groups live on the creator dashboard, not here. */
const WhatsAppSection = () => {
    const t = useT();
    const feed = usePublicFeed();
    const { isJoined, markJoined } = useJoinedGroups();
    if (!feed) return null;
    const community = feed.contact?.whatsappCommunity;
    if (!isPresent(community) || isJoined(community)) return null;
    return (
        <section className="space-y-4">
            <SectionHeader title={t('WhatsApp community')} />
            <WhatsAppGroupCard
                url={community}
                eyebrow={t('Newbi on WhatsApp')}
                title={t('Join the Newbi WhatsApp community')}
                body={t('First word on guestlists, gigs, giveaways and drops near you. Free to join.')}
                onJoined={markJoined}
            />
        </section>
    );
};

const Chips = ({ items, value, onChange }) => {
    const t = useT();
    return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        {items.map(({ key, label, icon }) => (
            <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                aria-pressed={value === key}
                className={cn(
                    'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-bold transition-colors',
                    value === key
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                        : 'border border-black/[0.08] bg-white text-gray-600 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-zinc-300'
                )}
            >
                {icon && React.createElement(icon, { size: 15 })}
                {t(label)}
            </button>
        ))}
    </div>
    );
};

const SECTIONS = [
    { type: 'guestlist', title: 'Guestlists' },
    { type: 'gig', title: 'Volunteer gigs' },
    { type: 'giveaway', title: 'Giveaways' },
    { type: 'form', title: 'Forms' },
];

const CommunityPage = () => {
    const t = useT();
    useDynamicMeta({ page: 'community' });
    useAppContent({ campaigns: false });
    const location = useLocation();
    const authUser = useAppStore(s => s.authUser);
    const feed = useLocalizedFeed(useAppStore(s => s.communityFeed));
    const loaded = useAppStore(s => s.communityFeedLoaded);
    const passes = useAppStore(s => s.passes);
    const myGuestlists = useMemo(() => guestlistPasses(passes).filter(isUpcomingPass), [passes]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [city, setCity] = useState('all');

    const cities = useMemo(() => {
        const counts = new Map();
        feed.forEach(i => { if (isPresent(i.city)) counts.set(i.city.trim(), (counts.get(i.city.trim()) || 0) + 1); });
        return [...counts.keys()].sort();
    }, [feed]);
    const shown = useMemo(() => feed.filter(i => (city === 'all' || !isPresent(i.city) || i.city.trim() === city)), [feed, city]);

    const gigId = searchParams.get('gig');
    const openGig = gigId ? feed.find(i => i.type === 'gig' && i.id === gigId) : null;
    const closeGig = () => { const next = new URLSearchParams(searchParams); next.delete('gig'); setSearchParams(next, { replace: true }); };

    return (
        <PageBody>
            <PageHeader eyebrow={t('Community')} title={t('What’s')} highlight={t('on.')} subtitle={t('Guestlists, gigs, giveaways and forms from Newbi.')} />

            {myGuestlists.length > 0 && (
                <section className="space-y-3">
                    <SectionHeader title={t('My guestlists')} />
                    <Rail>{myGuestlists.map(pass => <Card key={pass.ref} {...passCard(pass, { from: location })} />)}</Rail>
                </section>
            )}

            <JoinPanel />

            <WhatsAppSection />

            {/* One section per kind, like the old community hub: guestlists, gigs, giveaways, forms. */}
            {cities.length > 1 && (
                <Chips value={city} onChange={setCity} items={[{ key: 'all', label: 'All cities', icon: MapPin }, ...cities.map(c => ({ key: c, label: c }))]} />
            )}

            {!loaded ? (
                <CardGrid><CardSkeleton /><CardSkeleton /><CardSkeleton /></CardGrid>
            ) : shown.length ? (
                SECTIONS.map(({ type, title }) => {
                    const items = shown.filter(i => i.type === type);
                    if (!items.length) return null;
                    return (
                        <section key={type} className="space-y-3">
                            <SectionHeader title={t(title)} />
                            <CardGrid>{items.map(item => <Card key={item.key} {...feedCard(item, { from: location })} />)}</CardGrid>
                        </section>
                    );
                })
            ) : (
                <EmptyState
                    icon={Users}
                    title={t('Nothing open right now')}
                    message={t('New guestlists, gigs and giveaways show up here as soon as they open.')}
                />
            )}


            {authUser && myGuestlists.length === 0 && guestlistPasses(passes).length === 0 && loaded && (
                <p className="flex items-center gap-2 px-1 text-[14px] text-gray-500 dark:text-zinc-400"><Ticket size={15} /> {t('Passes for guestlists you join show up here.')}</p>
            )}

            {openGig && <GigSheet gig={openGig} onClose={closeGig} />}
        </PageBody>
    );
};

export default CommunityPage;
