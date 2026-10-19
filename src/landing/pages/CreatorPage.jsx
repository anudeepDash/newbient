import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Briefcase, Ticket, LayoutDashboard, Coins, Instagram, Star, Plus, Wallet, Music2, Gift } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import Timeline from '../components/Timeline';
import ClosingCta from '../components/ClosingCta';
import CampaignTeaser from '../components/CampaignTeaser';
import Proof from '../home/Proof';
import Wordmark from '../home/Wordmark';
import { BrandArt } from '../home/Hero';
import Sticker from '../components/Sticker';
import { usePublicFeed, isOff } from '../feed';
import { APP_LINKS, sizedImage } from '../links';

const STEPS = [
    { t: 'Apply', d: 'Tell us your Instagram, city and niche. It takes a few minutes and it is free.' },
    { t: 'Get matched', d: 'We shortlist you for brand campaigns that fit your audience and your city, and tell you when a brief is yours.' },
    { t: 'Create', d: 'Post to the brief, then submit your links and proof from your dashboard. We check it and mark it done.' },
    { t: 'Get rewarded', d: 'Every brief lists its reward up front. Some come with event access or passes on top.' },
];

// What creators get, floating around the N. mark in the hero.
const CREATOR_TAGS = [
    { label: 'Paid campaigns', icon: Wallet, pos: 'left-[2%] top-[10%]', tilt: '-rotate-[6deg]', delay: '0s' },
    { label: 'Concert access', icon: Music2, pos: 'right-[0%] top-[24%]', tilt: 'rotate-[5deg]', delay: '-2s', accent: true },
    { label: 'Barter collabs', icon: Gift, pos: 'left-[0%] bottom-[26%]', tilt: 'rotate-[4deg]', delay: '-4s' },
    { label: 'Guestlists & passes', icon: Ticket, pos: 'right-[4%] bottom-[8%]', tilt: '-rotate-[4deg]', delay: '-1s' },
];

const FAQS = [
    { q: 'Is it free to join?', a: 'Yes. No application fee, no subscription, no cut taken from what a brief pays you.' },
    { q: 'What do I need to apply?', a: 'An Instagram account with a real audience and a Professional (Creator or Business) account, so we can confirm your numbers through Instagram itself.' },
    { q: 'How big does my following need to be?', a: 'Each brief sets its own minimum, and many are open to smaller creators with an engaged, local audience. You will see the number on every campaign.' },
    { q: 'What kind of campaigns are there?', a: 'Brand campaigns across lifestyle, fashion, food, tech and music, event coverage at shows we run, and campus ambassador programmes.' },
    { q: 'How do I submit my work?', a: 'From your Newbi dashboard: paste your post links, add screenshots if the brief asks, and track approval there.' },
    { q: 'Can I refer other creators?', a: 'Yes. You get a personal referral code once you are in.' },
];

/*
 * The creator network pitch at newbi.live/creator, in the landing design.
 * Live data (open campaigns, testimonials, welcome points, past clients) comes
 * from the cached public feed; applying happens in the app.
 */
export default function CreatorPage() {
    const feed = usePublicFeed();
    const campaigns = feed?.campaigns || [];
    const testimonials = feed?.testimonials || [];
    const clients = isOff(feed, { section: 'home_clients' }) ? [] : (feed?.clients || []);
    const points = feed?.settings?.creatorWelcomePoints || null;

    const perks = [
        { icon: Briefcase, t: 'Matched brand campaigns', d: 'Briefs from brands we work with directly, matched to your city, niche and audience. No bidding, no middlemen.' },
        { icon: Ticket, t: 'Into the shows', d: 'Coverage gigs, guestlists and passes at the concerts, fests and launches Newbi runs.' },
        { icon: LayoutDashboard, t: 'One dashboard', d: 'Briefs, deliverables, approvals and the tickets for campaigns you are on, in one place.' },
        points
            ? { icon: Coins, t: `${points.toLocaleString('en-IN')} Newbi points to start`, d: 'Credited to your creator pass the day you join, next to your campaign history.' }
            : { icon: Star, t: 'A verified creator pass', d: 'Your Newbi profile, campaign history and status, visible to the brands we brief.' },
    ];


    return (
        <div>
            {/* Hero: the home hero's look (colour wash, sticker headline, the N. mark with tags). */}
            <section className="relative overflow-hidden">
                <div aria-hidden="true" className="absolute inset-0">
                    <div className="absolute inset-0 dark:hidden" style={{ background: 'radial-gradient(55% 55% at 88% 8%, rgba(57,255,20,0.32), transparent 70%), radial-gradient(45% 50% at 0% 85%, rgba(56,189,248,0.16), transparent 70%), radial-gradient(40% 40% at 45% 40%, rgba(255,255,255,0.7), transparent 70%)' }} />
                    <div className="absolute inset-0 hidden dark:block" style={{ background: 'radial-gradient(55% 55% at 88% 8%, rgba(57,255,20,0.20), transparent 70%), radial-gradient(45% 50% at 0% 85%, rgba(56,189,248,0.10), transparent 70%)' }} />
                    <div className="absolute inset-0 opacity-[0.035] text-black dark:text-white" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(to bottom, #000 30%, transparent 80%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 30%, transparent 80%)' }} />
                </div>
                <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-14 pt-4 sm:px-6 sm:pt-10 md:pt-16 lg:px-10 lg:pb-20">
                    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-10">
                        <div className="order-2 lg:order-1">
                            <h1 className="font-heading font-extrabold leading-[0.92] tracking-[-0.045em] text-gray-950 dark:text-white text-[14vw] sm:text-[10.5vw] lg:text-[6.2vw] 2xl:text-[7.2rem]">
                                <span className="nb-exit-l block">Create with brands.</span>{' '}
                                <span className="nb-exit-r block">Get into</span>{' '}
                                <span className="nb-exit-l block"><Sticker tilt="-rotate-[2deg]">the shows.</Sticker></span>
                            </h1>
                            <p className="nb-exit-fade mt-6 max-w-lg text-lg leading-snug text-gray-700 dark:text-zinc-300 md:text-xl">
                                Apply once. We match you to brand campaigns by city, niche and audience, and you work every campaign from one dashboard.
                            </p>
                            <div className="nb-exit-fade mt-8 flex flex-col gap-3 sm:flex-row">
                                <a href={APP_LINKS.creatorApply} className="group inline-flex h-14 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-neon-green px-8 font-heading text-base font-extrabold text-black shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:translate-y-0 active:shadow-[2px_2px_0_#000]">
                                    Apply as a creator <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                                </a>
                                <a href="#campaigns" className="inline-flex h-14 items-center justify-center rounded-full bg-white/60 px-8 font-heading text-base font-bold text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-12px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-black/[0.08] backdrop-blur-xl transition hover:bg-white/80 dark:bg-white/[0.08] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:ring-white/15 dark:hover:bg-white/[0.14]">
                                    {campaigns.length ? `See ${campaigns.length} live ${campaigns.length === 1 ? 'brief' : 'briefs'}` : 'See live briefs'}
                                </a>
                            </div>
                        </div>
                        <div className="order-1 -mb-2 lg:order-2 lg:mb-0">
                            <BrandArt tags={CREATOR_TAGS} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Open campaigns */}
            <section id="campaigns" aria-labelledby="campaigns-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10 overflow-hidden">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <SectionHeading id="campaigns-title" index="01" eyebrow="Open now" title="Live" highlight="briefs." text="Open a brief to see the reward, the deliverables and the follower minimum. Applying happens from your dashboard." />
                        <a href={APP_LINKS.creatorApply} className="nb-reveal inline-flex items-center gap-2 min-h-[44px] font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-neon-green">Apply to get notified <ArrowUpRight size={14} aria-hidden="true" /></a>
                    </div>
                    {campaigns.length > 0 ? (
                        <ul className="mt-12 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 carousel-scrollbar lg:grid lg:grid-cols-3 lg:overflow-visible" style={{ scrollPaddingLeft: '1rem' }}>
                            {campaigns.map((c) => (
                                <li key={c.id} className="nb-reveal shrink-0 w-[85vw] sm:w-[400px] lg:w-auto snap-start"><CampaignTeaser campaign={c} /></li>
                            ))}
                        </ul>
                    ) : (
                        <div className="nb-reveal mt-12 p-8 md:p-12 rounded-[1.75rem] border border-dashed border-gray-950/20 dark:border-white/20">
                            <p className="font-heading text-2xl font-bold text-gray-950 dark:text-white">New briefs drop often.</p>
                            <p className="mt-2 max-w-lg text-gray-600 dark:text-zinc-400">Nothing is open to the public right now. Creators in the network hear first, by email and in their dashboard.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* What you get */}
            <section aria-labelledby="perks-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                    <SectionHeading id="perks-title" index="02" eyebrow="What you get" title="More than" highlight="sponsored posts." text="Campaigns you would actually want to post, access to the nights we run, and one place to manage all of it." />
                    <ul className="mt-12 md:mt-16 grid gap-4 md:grid-cols-2">
                        {perks.map((p) => (
                            <li key={p.t} className="nb-reveal group p-7 md:p-10 rounded-[1.75rem] border border-gray-950/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] hover:border-gray-950/30 dark:hover:border-neon-green/40 transition-colors">
                                <span className="w-12 h-12 rounded-2xl bg-gray-950 text-neon-green dark:bg-white/[0.06] flex items-center justify-center"><p.icon size={22} aria-hidden="true" /></span>
                                <h3 className="mt-6 font-heading text-2xl md:text-3xl font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{p.t}</h3>
                                <p className="mt-3 text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{p.d}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* How it works */}
            <section aria-labelledby="how-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="lg:sticky lg:top-28 self-start">
                        <SectionHeading id="how-title" index="03" eyebrow="How it works" title="From apply to" highlight="paid." text="Four steps. Your dashboard shows where you are on every campaign." />
                        <div className="nb-reveal-late mt-10 p-6 rounded-[1.5rem] border border-gray-950/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
                            <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500"><Instagram size={14} aria-hidden="true" /> To apply you need</p>
                            <p className="mt-2 font-heading text-lg font-bold text-gray-950 dark:text-white">A Professional Instagram account (Creator or Business).</p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Switching takes a minute in Instagram settings. It lets us confirm your numbers through Instagram itself, with no screenshots.</p>
                        </div>
                    </div>
                    <Timeline steps={STEPS} />
                </div>
            </section>

            {testimonials.length > 0 && (
                <section aria-labelledby="voices-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                        <SectionHeading id="voices-title" index="04" eyebrow="Creator voices" title="From the" highlight="network." />
                        <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {testimonials.map((t) => (
                                <li key={t.id} className="nb-reveal flex flex-col p-7 rounded-[1.75rem] border border-gray-950/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
                                    <p className="flex gap-0.5 text-amber-400" aria-label={`${t.rating} out of 5`}>{Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={14} className="fill-current" aria-hidden="true" />)}</p>
                                    <p className="mt-4 text-lg leading-relaxed text-gray-800 dark:text-zinc-200">“{t.quote}”</p>
                                    <div className="mt-6 pt-5 border-t border-gray-950/10 dark:border-white/10 flex items-center gap-3">
                                        {t.avatarUrl ? <img src={sizedImage(t.avatarUrl, 80)} alt="" width="40" height="40" loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full bg-neon-green/20 text-emerald-700 dark:text-neon-green font-bold text-xs flex items-center justify-center">{t.name.slice(0, 2).toUpperCase()}</span>}
                                        <div><p className="font-heading font-bold text-gray-950 dark:text-white">{t.name}</p><p className="font-mono text-[11px] uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-500">{[t.city, t.niche || t.handle].filter(Boolean).join(' · ')}</p></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {clients.length > 0 && <Proof clients={clients} />}

            {/* FAQ */}
            <section aria-labelledby="cfaq-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
                    <SectionHeading id="cfaq-title" index={testimonials.length ? '05' : '04'} eyebrow="Questions" title="Before you" highlight="apply." className="lg:sticky lg:top-28 self-start" />
                    <div className="nb-reveal border-t border-gray-950/10 dark:border-white/10">
                        {FAQS.map((f, i) => (
                            <details key={f.q} className="group border-b border-gray-950/10 dark:border-white/10">
                                <summary className="flex items-center gap-5 min-h-[72px] py-5 cursor-pointer">
                                    <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-gray-400 dark:text-zinc-600">0{i + 1}</span>
                                    <span className="flex-1 font-heading text-xl md:text-2xl font-bold tracking-[-0.02em] text-gray-950 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-neon-green transition-colors">{f.q}</span>
                                    <span className="w-10 h-10 shrink-0 rounded-full border border-gray-950/15 dark:border-white/15 flex items-center justify-center text-gray-950 dark:text-white group-open:bg-neon-green group-open:border-neon-green group-open:text-black"><Plus size={17} className="nb-plus" aria-hidden="true" /></span>
                                </summary>
                                <p className="pb-7 pl-9 pr-4 max-w-2xl text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <ClosingCta title="Your next brief" highlight="is waiting." text="Free to join. A few minutes to apply. Your dashboard is ready the moment you are in." cta={{ label: 'Apply as a creator', href: APP_LINKS.creatorApply }} />
            <p className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 text-sm text-gray-500 dark:text-zinc-500">Brand or college looking to run a campaign? <Link to="/#enquire" className="inline-flex items-center gap-1 min-h-[44px] underline underline-offset-4 decoration-neon-green text-gray-950 dark:text-white">Work with us <ArrowRight size={14} aria-hidden="true" /></Link></p>
            <Wordmark />
        </div>
    );
}
