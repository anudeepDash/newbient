import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ListChecks, HandHeart, Gift, QrCode, Plus } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import Timeline from '../components/Timeline';
import ClosingCta from '../components/ClosingCta';
import Upcoming from '../home/Upcoming';
import Wordmark from '../home/Wordmark';
import { usePublicFeed, isOff } from '../feed';
import { APP_LINKS } from '../links';

const THINGS = [
    { icon: ListChecks, t: 'Guestlists', d: 'Get on the list for concerts, college nights and launches in your city, before they fill up.' },
    { icon: HandHeart, t: 'Volunteer gigs', d: 'Work a show from the inside: registrations, crowd, backstage, hospitality. Trained and briefed by us.' },
    { icon: Gift, t: 'Giveaways', d: 'Passes, merch and drops from the brands and artists we work with. Enter with one tap.' },
    { icon: QrCode, t: 'Your passes', d: 'Every pass lives in your account with a QR code. Show it at the gate and you are in.' },
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
            <section className="relative min-h-[88svh] flex flex-col overflow-hidden">
                <div aria-hidden="true" className="absolute inset-0">
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 85% 0%, rgba(57,255,20,0.16), transparent 70%)' }} />
                    <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.06] text-black dark:text-white" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'linear-gradient(to bottom, #000 40%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, #000 40%, transparent)' }} />
                </div>
                <div className="relative flex-1 flex flex-col justify-center max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-20">
                    <p className="nb-exit-fade flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">
                        <span className="relative flex w-2 h-2"><span className="nb-ping absolute inset-0 rounded-full bg-neon-green/70" /><span className="relative w-2 h-2 rounded-full bg-neon-green" /></span>
                        Newbi community
                    </p>
                    <h1 className="mt-6 font-heading font-extrabold tracking-[-0.045em] leading-[0.9] text-gray-950 dark:text-white text-[14vw] sm:text-[11vw] lg:text-[8.5vw] xl:text-[7.5vw]">
                        <span className="nb-exit-l block">Be on the list</span>{' '}
                        <span className="nb-exit-r block"><span className="nb-outline">for every show</span> <span className="text-emerald-600 dark:text-neon-green">near you.</span></span>
                    </h1>
                    <div className="nb-exit-fade mt-8 md:mt-10 max-w-xl">
                        <p className="text-lg md:text-2xl leading-snug text-gray-700 dark:text-zinc-300">
                            Guestlists, volunteer gigs, giveaways and passes, all in one account. Sign in once; your QR code does the rest at the gate.
                        </p>
                        <div className="mt-7 flex flex-col sm:flex-row gap-3">
                            <a href={APP_LINKS.community} className="group h-14 px-8 inline-flex items-center justify-center gap-2 rounded-full bg-neon-green text-black font-heading font-bold text-base hover:scale-[1.03] active:scale-[0.98] transition">
                                Join the community <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" aria-hidden="true" />
                            </a>
                            <a href="#upcoming" className="h-14 px-8 inline-flex items-center justify-center rounded-full border border-gray-950/25 dark:border-white/25 text-gray-950 dark:text-white font-heading font-bold text-base hover:bg-gray-950 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                                What's coming up
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <section aria-labelledby="things-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                    <SectionHeading id="things-title" index="01" eyebrow="What you can do" title="One account." highlight="Every night." text="Everything Newbi runs for the crowd lives in one place, under your name." />
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
                    <SectionHeading id="chow-title" index="02" eyebrow="How it works" title="Sign in once." highlight="Scan at the door." text="No printouts, no screenshots, no re-entering your details for every show." className="lg:sticky lg:top-28 self-start" />
                    <Timeline steps={STEPS} />
                </div>
            </section>

            {events.length > 0 ? (
                <Upcoming events={events} index="03" />
            ) : (
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
