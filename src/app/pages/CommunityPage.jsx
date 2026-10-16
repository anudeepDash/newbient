import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Users from 'lucide-react/dist/esm/icons/users';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { guestlistPasses } from '../../lib/store/passes';
import { communityPost } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import { Card, Button, CARD_TYPES, Field, Sheet } from '../../components/app';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import { useAppContent } from '../useAppContent';
import { feedCard, dateLabel } from '../cards';
import { appPath } from '../host';
import { plainText } from '../community/communityParts';
import { isUpcomingPass, passCard } from '../passes/passCards';
import PageHeader, { PageBody } from './PageHeader';
import { CardGrid, CardSkeleton, EmptyState, HeroPanel, SectionHeader, Rail } from './parts';

/*
 * Community: your guestlist passes, a one-tap Join, and one feed of cards
 * (guestlists, gigs, giveaways, forms) filtered by type and city. Past events
 * and closed forms drop off by date. Each card opens its page in the app;
 * gigs open a sheet with "I'm interested".
 */

const FILTER_LABELS = { guestlist: 'Guestlists', gig: 'Gigs', giveaway: 'Giveaways', form: 'Forms' };

/* "I'm interested" in a gig: saved in the app first, then a WhatsApp/link button. */
const GigSheet = ({ gig, onClose }) => {
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
    const interested = () => gate.run({ type: INTENTS.gigInterest, payload: { id: gig.id }, returnTo: `${appPath('/community')}?gig=${encodeURIComponent(gig.id)}` }, save);

    if (!gig) return null;
    const wa = gig.applyType === 'whatsapp' ? String(gig.applyLink || '').replace(/\D/g, '') : '';
    const next = gig.applyType === 'whatsapp'
        ? (wa ? { label: 'Message the team on WhatsApp', icon: MessageCircle, href: `https://wa.me/${wa}?text=${encodeURIComponent(`Hi! I'm interested in the gig: ${gig.title}`)}` } : null)
        : gig.applyType === 'form' ? { label: 'Fill the form', to: gig.applyLink }
            : /^https?:\/\//.test(gig.applyLink || '') ? { label: 'Apply', icon: ExternalLink, href: gig.applyLink } : null;
    const description = plainText(gig.description);

    return (
        <Sheet
            open
            onClose={onClose}
            title={gig.title}
            subtitle="Volunteer gig"
            footer={state === 'saved' ? (
                next ? <Button className="w-full" size="lg" icon={next.icon} href={next.href} to={next.to} target={next.href ? '_blank' : undefined} rel={next.href ? 'noopener noreferrer' : undefined}>{next.label}</Button>
                    : <Button className="w-full" size="lg" variant="secondary" onClick={onClose}>Done</Button>
            ) : (
                <Button className="w-full" size="lg" icon={HeartHandshake} loading={state === 'saving'} onClick={interested}>I’m interested</Button>
            )}
        >
            <div className="space-y-4">
                {isPresent(gig.image) && <img src={gig.image} alt="" className="aspect-video w-full rounded-2xl object-cover" />}
                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                    <Field icon={CalendarDays} label="When" value={dateLabel(gig.date)} />
                    <Field icon={MapPin} label="Where" value={[gig.venue, gig.city].filter(Boolean).join(', ') || null} />
                    <Field icon={Users} label="Spots" value={gig.slots || null} />
                </div>
                {description && <p className="whitespace-pre-line text-[15px] text-gray-700 dark:text-zinc-300">{description}</p>}
                {state === 'saved' && (
                    <p className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[15px] font-semibold text-emerald-800 dark:text-neon-green">
                        <CircleCheck size={17} /> Saved. The team can see you’re interested.
                    </p>
                )}
                {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
            </div>
        </Sheet>
    );
};

/* One tap to join (sets capabilities.member). Replaces the old Google Form gate. */
const JoinPanel = () => {
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const joinCommunity = useAppStore(s => s.joinCommunity);
    const whatsappCommunity = useLegacyStore(s => s.siteDetails?.whatsappCommunity);
    const gate = useAuthGate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const member = Boolean(profile?.capabilities?.member);

    const join = async () => {
        setBusy(true);
        setError('');
        try { await joinCommunity(); } catch { setError('We couldn’t add you just now. Please try again.'); }
        setBusy(false);
    };
    useResumeIntent(INTENTS.joinCommunity, join);

    if (authUser && !profile) return null;
    if (member) {
        if (!isPresent(whatsappCommunity)) return null;
        return (
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-4">
                <CircleCheck size={20} className="shrink-0 text-emerald-700 dark:text-neon-green" />
                <p className="min-w-0 flex-1 text-[15px] font-semibold">You’re in the Newbi community.</p>
                <Button size="sm" variant="secondary" icon={MessageCircle} href={whatsappCommunity} target="_blank" rel="noopener noreferrer">WhatsApp group</Button>
            </div>
        );
    }
    return (
        <HeroPanel eyebrow="Newbi community" title="Guestlists, gigs and giveaways, first.">
            <p className="text-[15px] text-gray-600 dark:text-zinc-300">Join the Newbi community. It’s free, one tap, no forms.</p>
            <div className="pt-1">
                <Button loading={busy} onClick={() => gate.run({ type: INTENTS.joinCommunity }, join)}>{authUser ? 'Join the community' : 'Sign in and join'}</Button>
            </div>
            {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </HeroPanel>
    );
};

const Chips = ({ items, value, onChange }) => (
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
                {label}
            </button>
        ))}
    </div>
);

const CommunityPage = () => {
    useAppContent({ campaigns: false });
    const authUser = useAppStore(s => s.authUser);
    const feed = useAppStore(s => s.communityFeed);
    const loaded = useAppStore(s => s.communityFeedLoaded);
    const passes = useAppStore(s => s.passes);
    const myGuestlists = useMemo(() => guestlistPasses(passes).filter(isUpcomingPass), [passes]);
    const { requestSignIn } = useAuthGate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [filter, setFilter] = useState('all');
    const [city, setCity] = useState('all');

    const types = useMemo(() => Object.keys(FILTER_LABELS).filter(t => feed.some(i => i.type === t)), [feed]);
    const cities = useMemo(() => {
        const counts = new Map();
        feed.forEach(i => { if (isPresent(i.city)) counts.set(i.city.trim(), (counts.get(i.city.trim()) || 0) + 1); });
        return [...counts.keys()].sort();
    }, [feed]);
    const shown = useMemo(() => feed.filter(i => (filter === 'all' || i.type === filter) && (city === 'all' || !isPresent(i.city) || i.city.trim() === city)), [feed, filter, city]);

    const gigId = searchParams.get('gig');
    const openGig = gigId ? feed.find(i => i.type === 'gig' && i.id === gigId) : null;
    const closeGig = () => { const next = new URLSearchParams(searchParams); next.delete('gig'); setSearchParams(next, { replace: true }); };

    return (
        <PageBody>
            <PageHeader eyebrow="Community" title="What’s on" subtitle="Guestlists, gigs, giveaways and forms from Newbi." />

            {myGuestlists.length > 0 && (
                <section className="space-y-3">
                    <SectionHeader title="My guestlists" />
                    <Rail>{myGuestlists.map(pass => <Card key={pass.ref} {...passCard(pass)} />)}</Rail>
                </section>
            )}

            <JoinPanel />

            {types.length > 1 && (
                <Chips
                    value={filter}
                    onChange={setFilter}
                    items={[{ key: 'all', label: 'All' }, ...types.map(t => ({ key: t, label: FILTER_LABELS[t], icon: CARD_TYPES[t].icon }))]}
                />
            )}
            {cities.length > 1 && (
                <Chips value={city} onChange={setCity} items={[{ key: 'all', label: 'All cities', icon: MapPin }, ...cities.map(c => ({ key: c, label: c }))]} />
            )}

            {!loaded ? (
                <CardGrid><CardSkeleton /><CardSkeleton /><CardSkeleton /></CardGrid>
            ) : shown.length ? (
                <CardGrid>{shown.map(item => <Card key={item.key} {...feedCard(item)} />)}</CardGrid>
            ) : (
                <EmptyState
                    icon={Users}
                    title="Nothing open right now"
                    message="New guestlists, gigs and giveaways show up here as soon as they open."
                />
            )}

            {loaded && !authUser && (
                <p className="px-1 text-[14px] text-gray-500 dark:text-zinc-400">
                    <button type="button" className="font-bold text-emerald-700 underline-offset-2 hover:underline dark:text-neon-green" onClick={() => requestSignIn()}>Sign in</button> to see members-only guestlists and your passes.
                </p>
            )}

            {authUser && myGuestlists.length === 0 && guestlistPasses(passes).length === 0 && loaded && (
                <p className="flex items-center gap-2 px-1 text-[14px] text-gray-500 dark:text-zinc-400"><Ticket size={15} /> Passes for guestlists you join show up here.</p>
            )}

            {openGig && <GigSheet gig={openGig} onClose={closeGig} />}
        </PageBody>
    );
};

export default CommunityPage;
