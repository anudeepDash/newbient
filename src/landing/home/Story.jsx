import Sticker from '../components/Sticker';
import SectionLabel from '../components/SectionLabel';
import { ArrowDown } from 'lucide-react';
import ScrollCue from '../components/ScrollCue';

// What Newbi runs, one panel per service. On desktop the section pins and the
// panels slide sideways with the scroll; on phones they stack.
const PANELS = [
    {
        n: '01',
        title: ['Event marketing', '& production'],
        text: 'Concerts, launches, fests, club nights and corporate events, produced end to end: artist booking, stage, sound and lights, venue and permits, ticketing and QR entry.',
        chips: ['Artist booking', 'Technical production', 'Venue & permits', 'Ticketing & QR entry'],
    },
    {
        n: '02',
        title: ['Brand', 'activations'],
        text: 'Experiential zones, sampling, pop-ups and in-store experiences that move people from seeing a brand to trying it, in the city or on campus.',
        chips: ['Experiential zones', 'Fabrication & AV', 'Sampling & pop-ups', 'Footfall & conversion report'],
    },
    {
        n: '03',
        title: ['Influencer', 'campaigns'],
        text: 'Creators and ambassadors from our own network, matched by city, niche and audience, plus hyper-local seeding through city pages, community pages and WhatsApp groups.',
        chips: ['Creator shortlists', 'Campus ambassadors', 'Local page seeding', 'Approvals & proof'],
    },
    {
        n: '04',
        title: ['Digital', '& social'],
        text: 'Launch campaigns, social media management and content from every night we run, with an analytics and growth report at the end.',
        chips: ['Launch campaigns', 'Social media management', 'Event content', 'Analytics report'],
    },
    {
        n: '05',
        title: ['Crews', '& staffing'],
        text: 'Trained volunteer crews for registrations, crowd, backstage, hospitality and guest support, recruited, briefed and managed by us.',
        chips: ['Recruitment & training', 'On-site coordination', 'Hospitality & backstage', 'Performance report'],
    },
];

/*
 * About Newbi and what we run, in one section. The intro slide says who we
 * are; the next five are what we run. Where the browser supports scroll-driven
 * animations, the section pins and the slides move sideways with the scroll
 * (phones included); elsewhere they stack.
 */
export default function Story() {
    return (
        <section id="services" aria-labelledby="story-title" className="nb-story scroll-mt-20 relative">
            <span id="about" className="absolute top-0" aria-hidden="true" />
            <div className="nb-story-pin">
                <div className="nb-story-track grid gap-14 py-20">
                    {/* Intro slide: who we are */}
                    <div className="nb-story-panel flex items-center px-4 sm:px-6 lg:px-10">
                        <div className="w-full">
                            <SectionLabel index="01">About &amp; what we run</SectionLabel>
                            <h2 id="story-title" className="mt-5 font-heading font-extrabold tracking-[-0.04em] leading-[0.92] text-[11.5vw] sm:text-[8vw] lg:text-[5.6vw] text-gray-950 dark:text-white">
                                Plans are easy.<br />We're the crew<br /><Sticker subtle>that runs them.</Sticker>
                            </h2>
                            <p className="mt-6 max-w-lg text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">
                                Newbi is an event marketing and live entertainment company. You bring a goal, a date and a budget; we bring the artists, the venue, the build, the creators and the crew, run it, and report on it. One team, so nothing falls between vendors.
                            </p>
                            <p className="nb-story-hint mt-8 hidden items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">Scroll for the five things we run <ArrowDown size={14} aria-hidden="true" /></p>
                        </div>
                    </div>

                    {PANELS.map((p) => (
                        <article key={p.n} className="nb-story-panel flex items-center px-4 sm:px-6 lg:px-10">
                            <div className="w-full grid gap-6 lg:grid-cols-[auto_minmax(0,26rem)] lg:gap-12 lg:items-center lg:justify-start">
                                <div>
                                    <span className="block font-heading font-extrabold text-[18vw] sm:text-[12vw] lg:text-[8vw] leading-[0.8] tracking-[-0.05em] nb-ghost">{p.n}</span>
                                    <h3 className="mt-2 font-heading font-extrabold tracking-[-0.04em] leading-[0.92] text-[10.5vw] sm:text-[8vw] lg:text-[5.2vw] text-gray-950 dark:text-white lg:whitespace-nowrap">
                                        {p.title[0]}<br /><Sticker subtle>{p.title[1]}</Sticker>
                                    </h3>
                                </div>
                                <div className="lg:pl-12 lg:border-l lg:border-gray-950/15 lg:dark:border-white/15">
                                    <p className="text-base sm:text-lg md:text-xl leading-relaxed text-gray-700 dark:text-zinc-300">{p.text}</p>
                                    <ul className="mt-5 md:mt-7 flex flex-wrap gap-2" aria-label={`${p.title.join(' ')}: what we handle`}>
                                        {p.chips.map((c) => (
                                            <li key={c} className="px-3.5 py-2 md:px-4 md:py-2.5 rounded-full border border-gray-950/15 dark:border-white/15 font-mono text-[11px] md:text-[12px] font-bold uppercase tracking-[0.1em] text-gray-800 dark:text-zinc-200">{c}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <ScrollCue />

                {/* Progress bar while the section is pinned */}
                <div aria-hidden="true" className="nb-story-progress hidden absolute inset-x-0 bottom-0 h-1 bg-gray-950/10 dark:bg-white/10">
                    <div className="nb-story-bar h-full w-full bg-neon-green" />
                </div>
            </div>
        </section>
    );
}
