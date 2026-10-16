import { ArrowRight } from 'lucide-react';

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

export default function Story() {
    return (
        <section id="services" aria-labelledby="story-title" className="nb-story scroll-mt-20 relative">
            <div className="nb-story-pin">
                <div className="nb-story-track grid gap-14 lg:gap-0 py-20 lg:py-0">
                    {/* Intro panel */}
                    <div className="nb-story-panel flex items-center">
                        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10">
                            <p className="nb-reveal font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500"><span className="text-emerald-700 dark:text-neon-green">01</span> — What we run</p>
                            <h2 id="story-title" className="nb-reveal mt-5 font-heading font-extrabold tracking-[-0.04em] leading-[0.88] text-[16vw] sm:text-[11vw] lg:text-[8.5vw] text-gray-950 dark:text-white">
                                Five<br />things.<br /><span className="nb-outline">One crew.</span>
                            </h2>
                            <p className="nb-reveal mt-6 max-w-md text-lg text-gray-600 dark:text-zinc-400">Event marketing, activations, influencers, digital and crews. Most projects mix two or three; one team runs all of it, so nothing falls between vendors.</p>
                            <p className="nb-reveal mt-8 hidden lg:flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">Keep scrolling <ArrowRight size={14} aria-hidden="true" /></p>
                        </div>
                    </div>

                    {PANELS.map((p) => (
                        <article key={p.n} className="nb-story-panel flex items-center">
                            <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                                <div className="nb-reveal lg:[animation:none]">
                                    <span className="block font-heading font-extrabold text-[22vw] sm:text-[14vw] lg:text-[11vw] leading-[0.8] tracking-[-0.05em] nb-outline-soft">{p.n}</span>
                                    <h3 className="mt-2 font-heading font-extrabold tracking-[-0.04em] leading-[0.88] text-[14vw] sm:text-[10vw] lg:text-[6.5vw] text-gray-950 dark:text-white">
                                        {p.title[0]}<br /><span className="text-emerald-600 dark:text-neon-green">{p.title[1]}</span>
                                    </h3>
                                </div>
                                <div className="nb-reveal lg:[animation:none] lg:pl-10 lg:border-l lg:border-gray-950/10 lg:dark:border-white/10">
                                    <p className="text-lg md:text-xl leading-relaxed text-gray-700 dark:text-zinc-300">{p.text}</p>
                                    <ul className="mt-7 flex flex-wrap gap-2" aria-label={`${p.title.join(' ')}: what we handle`}>
                                        {p.chips.map((c) => (
                                            <li key={c} className="px-4 py-2.5 rounded-full border border-gray-950/15 dark:border-white/15 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-gray-800 dark:text-zinc-200">{c}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Progress bar (desktop, while the section is pinned) */}
                <div aria-hidden="true" className="hidden absolute inset-x-0 bottom-0 h-1 bg-gray-950/10 dark:bg-white/10 lg:block">
                    <div className="nb-story-bar hidden h-full w-full bg-neon-green" />
                </div>
            </div>
        </section>
    );
}
