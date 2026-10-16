import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Briefcase, Ticket, LayoutDashboard, Coins, Instagram, Star, Plus } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import Timeline from '../components/Timeline';
import ClosingCta from '../components/ClosingCta';
import CampaignTeaser from '../components/CampaignTeaser';
import Proof from '../home/Proof';
import Wordmark from '../home/Wordmark';
import { usePublicFeed, isOff } from '../feed';
import { APP_LINKS } from '../links';

const STEPS = [
    { t: 'Apply', d: 'Tell us your Instagram, city and niche. It takes a few minutes and it is free.' },
    { t: 'Get matched', d: 'We shortlist you for brand campaigns that fit your audience and your city, and tell you when a brief is yours.' },
    { t: 'Create', d: 'Post to the brief, then submit your links and proof from your dashboard. We check it and mark it done.' },
    { t: 'Get rewarded', d: 'Every brief lists its reward up front. Some come with event access or passes on top.' },
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

    const stats = [
        campaigns.length > 0 && { v: String(campaigns.length), l: campaigns.length === 1 ? 'Open campaign' : 'Open campaigns' },
        clients.length > 0 && { v: String(clients.length), l: 'Brands worked with' },
        points && { v: points.toLocaleString('en-IN'), l: 'Welcome points' },
        { v: '₹0', l: 'To join' },
    ].filter(Boolean);

    return (
        <div>
            {/* Hero */}
            <section className="relative min-h-[88svh] flex flex-col overflow-hidden">
                <div aria-hidden="true" className="absolute inset-0">
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 15% 0%, rgba(57,255,20,0.16), transparent 70%)' }} />
                    <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.06] text-black dark:text-white" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'linear-gradient(to bottom, #000 40%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, #000 40%, transparent)' }} />
                </div>
                <div className="relative flex-1 flex flex-col justify-center max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-20">
                    <p className="nb-exit-fade flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">
                        <span className="relative flex w-2 h-2"><span className="nb-ping absolute inset-0 rounded-full bg-neon-green/70" /><span className="relative w-2 h-2 rounded-full bg-neon-green" /></span>
                        Newbi creator network
                    </p>
                    <h1 className="mt-6 font-heading font-extrabold tracking-[-0.045em] leading-[0.9] text-gray-950 dark:text-white text-[14vw] sm:text-[11vw] lg:text-[8.5vw] xl:text-[7.5vw]">
                        <span className="nb-exit-l block">Create with brands.</span>{' '}
                        <span className="nb-exit-r block"><span className="nb-ghost">Get into</span> <span className="text-emerald-600 dark:text-neon-green">the shows.</span></span>
                    </h1>
                    <div className="nb-exit-fade mt-8 md:mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="max-w-xl">
                            <p className="text-lg md:text-2xl leading-snug text-gray-700 dark:text-zinc-300">
                                Apply once. We match you to brand campaigns by city, niche and audience, and you work every campaign from one dashboard.
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row gap-3">
                                <a href={APP_LINKS.creatorApply} className="group h-14 px-8 inline-flex items-center justify-center gap-2 rounded-full bg-neon-green text-black font-heading font-bold text-base hover:scale-[1.03] active:scale-[0.98] transition">
                                    Apply as a creator <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" aria-hidden="true" />
                                </a>
                                <a href="#campaigns" className="h-14 px-8 inline-flex items-center justify-center rounded-full border border-gray-950/25 dark:border-white/25 text-gray-950 dark:text-white font-heading font-bold text-base hover:bg-gray-950 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                                    See open campaigns
                                </a>
                            </div>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-10 gap-y-5 lg:text-right">
                            {stats.map((s) => (
                                <div key={s.l}>
                                    <dd className="font-heading font-extrabold tracking-[-0.04em] text-4xl md:text-5xl text-gray-950 dark:text-white tabular-nums">{s.v}</dd>
                                    <dt className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">{s.l}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>

            {/* What you get */}
            <section aria-labelledby="perks-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                    <SectionHeading id="perks-title" index="01" eyebrow="What you get" title="More than" highlight="sponsored posts." text="Campaigns you would actually want to post, access to the nights we run, and one place to manage all of it." />
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
                        <SectionHeading id="how-title" index="02" eyebrow="How it works" title="From apply to" highlight="paid." text="Four steps. Your dashboard shows where you are on every campaign." />
                        <div className="nb-reveal-late mt-10 p-6 rounded-[1.5rem] border border-gray-950/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
                            <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500"><Instagram size={14} aria-hidden="true" /> To apply you need</p>
                            <p className="mt-2 font-heading text-lg font-bold text-gray-950 dark:text-white">A Professional Instagram account (Creator or Business).</p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Switching takes a minute in Instagram settings. It lets us confirm your numbers through Instagram itself, with no screenshots.</p>
                        </div>
                    </div>
                    <Timeline steps={STEPS} />
                </div>
            </section>

            {/* Open campaigns */}
            <section id="campaigns" aria-labelledby="campaigns-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10 overflow-hidden">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <SectionHeading id="campaigns-title" index="03" eyebrow="Open now" title="Live" highlight="briefs." text="Open a brief to see the reward, the deliverables and the follower minimum. Applying happens from your dashboard." />
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
                                        {t.avatarUrl ? <img src={t.avatarUrl} alt="" width="40" height="40" loading="lazy" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full bg-neon-green/20 text-emerald-700 dark:text-neon-green font-bold text-xs flex items-center justify-center">{t.name.slice(0, 2).toUpperCase()}</span>}
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
