import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ListChecks, HandHeart, Gift, QrCode, Plus } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import Timeline from '../components/Timeline';
import ClosingCta from '../components/ClosingCta';
import Upcoming from '../home/Upcoming';
import Wordmark from '../home/Wordmark';
import { BrandArt } from '../home/Hero';
import Sticker from '../components/Sticker';
import { usePublicFeed, isOff } from '../feed';
import { APP_LINKS } from '../links';

const THINGS = [
    { icon: ListChecks, t: 'Guestlists', d: 'Get on the list for concerts, college nights and launches in your city, before they fill up.' },
    { icon: HandHeart, t: 'Volunteer gigs', d: 'Work a show from the inside: registrations, crowd, backstage, hospitality. Trained and briefed by us.' },
    { icon: Gift, t: 'Giveaways', d: 'Passes, merch and drops from the brands and artists we work with. Enter with one tap.' },
    { icon: QrCode, t: 'Your passes', d: 'Every pass lives in your account with a QR code. Show it at the gate and you are in.' },
];

// What the community gets, floating around the N. mark in the hero.
const COMMUNITY_TAGS = [
    { label: 'Guestlists', icon: ListChecks, pos: 'left-[4%] top-[10%]', tilt: '-rotate-[6deg]', delay: '0s' },
    { label: 'QR passes', icon: QrCode, pos: 'right-[2%] top-[24%]', tilt: 'rotate-[5deg]', delay: '-2s', accent: true },
    { label: 'Volunteer gigs', icon: HandHeart, pos: 'left-[0%] bottom-[26%]', tilt: 'rotate-[4deg]', delay: '-4s' },
    { label: 'Giveaways', icon: Gift, pos: 'right-[6%] bottom-[8%]', tilt: '-rotate-[4deg]', delay: '-1s' },
];

const STEPS = [
    { t: 'Sign in', d: 'One account with your phone or Google. No forms to fill again later.' },
    { t: 'Join a list', d: 'Pick a guestlist, a gig or a giveaway. Some lists take a quick task or a +1 limit; it says so on the page.' },
    { t: 'Get your pass', d: 'Your pass and QR code appear in your account, with the date, venue and door time.' },
    { t: 'Show up', d: 'Scan at the gate. The same crew that built the night is the one checking you in.' },
];

const FAQS = [
    { q: 'Is it free?', a: 'Joining is free. Guestlists are free unless the page says otherwise; ticketed shows show the price up front.' },
    { q: 'Do I need to be a student?', a: 'No. Most of our shows are for anyone of age in the city. College-only nights say so on the list.' },
    { q: 'How do passes work at the gate?', a: 'Each pass has its own QR code in your account. Our team scans it at the door; no printouts and no screenshots needed.' },
    { q: 'Can I bring friends?', a: 'Each list sets its own limit per person. You will see it before you join.' },
    { q: 'What do volunteers get?', a: 'Depends on the show: access, food, a crew pass, sometimes a stipend. Every gig lists what it comes with.' },
];

// Old community share links (?gl=, ?gig=, ?form=) open the right page in the app.
function useLegacyQueryRedirect() {
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const go = (url) => window.location.replace(url);
        if (p.get('gl')) go(APP_LINKS.event(p.get('gl')));
        else if (p.get('gig')) go(`${APP_LINKS.community}?gig=${encodeURIComponent(p.get('gig'))}`);
        else if (p.get('form')) go(`/forms/${encodeURIComponent(p.get('form'))}`);
    }, []);
}

/*
 * The community pitch at newbi.live/community: what students and fans can do
 * with a Newbi account, how it works, and what is coming up. Joining happens
 * in the app.
 */
export default function CommunityPage() {
    useLegacyQueryRedirect();
    const feed = usePublicFeed();
    const events = isOff(feed, { section: 'home_upcoming' }) ? [] : (feed?.events || []);

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
                                <span className="nb-exit-l block">Be on the list</span>{' '}
                                <span className="nb-exit-r block">for every show</span>{' '}
                                <span className="nb-exit-l block"><Sticker tilt="-rotate-[2deg]">near you.</Sticker></span>
                            </h1>
                            <p className="nb-exit-fade mt-6 max-w-lg text-lg leading-snug text-gray-700 dark:text-zinc-300 md:text-xl">
                                Guestlists, volunteer gigs, giveaways and passes, all in one account. Sign in once; your QR code does the rest at the gate.
                            </p>
                            <div className="nb-exit-fade mt-8 flex flex-col gap-3 sm:flex-row">
                                <a href={APP_LINKS.community} className="group inline-flex h-14 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-neon-green px-8 font-heading text-base font-extrabold text-black shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:translate-y-0 active:shadow-[2px_2px_0_#000]">
                                    Join the community <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                                </a>
                                <a href="#upcoming" className="inline-flex h-14 items-center justify-center rounded-full bg-white/60 px-8 font-heading text-base font-bold text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-12px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-black/[0.08] backdrop-blur-xl transition hover:bg-white/80 dark:bg-white/[0.08] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:ring-white/15 dark:hover:bg-white/[0.14]">
                                    What's coming up
                                </a>
                            </div>
                        </div>
                        <div className="order-1 -mb-2 lg:order-2 lg:mb-0">
                            <BrandArt tags={COMMUNITY_TAGS} />
                        </div>
                    </div>
                </div>
            </section>

            {/* What's coming up, right under the hero when there is something to show. */}
            {events.length > 0 && <Upcoming events={events} index="01" />}

            <section aria-labelledby="things-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                    <SectionHeading id="things-title" index={events.length ? '02' : '01'} eyebrow="What you can do" title="One account." highlight="Every night." text="Everything Newbi runs for the crowd lives in one place, under your name." />
                    <ul className="mt-12 md:mt-16 grid gap-4 md:grid-cols-2">
                        {THINGS.map((p) => (
                            <li key={p.t} className="nb-reveal group p-7 md:p-10 rounded-[1.75rem] border border-gray-950/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] hover:border-gray-950/30 dark:hover:border-neon-green/40 transition-colors">
                                <span className="w-12 h-12 rounded-2xl bg-gray-950 text-neon-green dark:bg-white/[0.06] flex items-center justify-center"><p.icon size={22} aria-hidden="true" /></span>
                                <h3 className="mt-6 font-heading text-2xl md:text-3xl font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{p.t}</h3>
                                <p className="mt-3 text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{p.d}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section aria-labelledby="chow-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                    <SectionHeading id="chow-title" index={events.length ? '03' : '02'} eyebrow="How it works" title="Sign in once." highlight="Scan at the door." text="No printouts, no screenshots, no re-entering your details for every show." className="lg:sticky lg:top-28 self-start" />
                    <Timeline steps={STEPS} />
                </div>
            </section>

            {events.length === 0 && (
                <section id="upcoming" aria-labelledby="noup-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                        <SectionHeading id="noup-title" index="03" eyebrow="Coming up" title="Next shows land" highlight="here first." text="Nothing public is announced right now. Members hear about new lists first, in their account and by email." />
                        <a href={APP_LINKS.community} className="nb-reveal mt-8 inline-flex items-center gap-2 min-h-[44px] font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-neon-green">Join to hear first <ArrowUpRight size={14} aria-hidden="true" /></a>
                    </div>
                </section>
            )}

            <section aria-labelledby="cmfaq-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
                    <SectionHeading id="cmfaq-title" index="04" eyebrow="Questions" title="Good to" highlight="know." className="lg:sticky lg:top-28 self-start" />
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

            <ClosingCta title="The next night out" highlight="starts here." text="Join once and every guestlist, gig and giveaway is one tap away." cta={{ label: 'Join the community', href: APP_LINKS.community }} />
            <p className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 text-sm text-gray-500 dark:text-zinc-500">Creator with an audience? <Link to="/creator" className="inline-flex items-center gap-1 min-h-[44px] underline underline-offset-4 decoration-neon-green text-gray-950 dark:text-white">See the creator network <ArrowRight size={14} aria-hidden="true" /></Link></p>
            <Wordmark />
        </div>
    );
}
