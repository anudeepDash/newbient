import SectionHeading from '../components/SectionHeading';

// About Newbi: what the company is, what you bring, what we bring, and a few live facts.
const YOU = ['A goal', 'An audience', 'A date', 'A budget'];
const WE = [
    'The concept, the plan and the timeline',
    'Artists, talent and hosts',
    'Venue, permits, fabrication and technical production',
    'Creators and campus ambassadors from our own network',
    'Trained crews for entry, crowd, backstage and hospitality',
    'Ticketing, guestlists and QR entry on our own platform',
    'Content on the night and a report after',
];

export default function About({ recentStages = [], openCampaigns = 0, upcomingCount = 0 }) {
    const facts = [
        { k: 'Company', v: 'Newbi Entertainment & Marketing LLP' },
        { k: 'Based', v: 'India, wherever the crowd is' },
        recentStages.length > 0 && { k: 'Recent stages', v: recentStages.join(', ') },
        openCampaigns > 0 && { k: 'Open now', v: `${openCampaigns} creator ${openCampaigns === 1 ? 'campaign' : 'campaigns'}` },
        upcomingCount > 0 && { k: 'Coming up', v: `${upcomingCount} public ${upcomingCount === 1 ? 'event' : 'events'}` },
    ].filter(Boolean);

    return (
        <section id="about" aria-labelledby="about-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                <SectionHeading
                    id="about-title"
                    index="02"
                    eyebrow="About Newbi"
                    title="Plans are easy. We're the crew that"
                    highlight="runs them."
                    className="max-w-4xl"
                />
                <div className="mt-10 md:mt-14 grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
                    <div className="nb-reveal space-y-5 text-lg md:text-xl leading-relaxed text-gray-700 dark:text-zinc-300">
                        <p>Newbi is an event marketing and live entertainment company. Brands, colleges and artists come to us with a goal and a date; we come back with the artists, the venue, the build, the creators, the crew and the plan. Then we run it, and we report on it.</p>
                        <p>We started with young audiences and still know them best. The same crew now runs product launches, corporate events, concerts and city-wide campaigns, with no sub-vendors for you to chase and one number to call before, during and after.</p>
                    </div>
                    <div className="nb-reveal-late grid grid-cols-[auto_1fr] gap-x-8 gap-y-8 self-start">
                        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500 pt-1">You bring</p>
                        <ul className="flex flex-wrap gap-2">
                            {YOU.map((y) => <li key={y} className="px-4 py-2 rounded-full border border-gray-950/15 dark:border-white/15 font-heading font-semibold text-sm text-gray-950 dark:text-white">{y}</li>)}
                        </ul>
                        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-700 dark:text-neon-green pt-1">We bring</p>
                        <ul className="divide-y divide-gray-950/10 dark:divide-white/10 border-y border-gray-950/10 dark:border-white/10">
                            {WE.map((w) => <li key={w} className="py-3 font-heading font-semibold text-base md:text-lg text-gray-950 dark:text-white">{w}</li>)}
                        </ul>
                    </div>
                </div>
                <dl className="nb-reveal mt-16 md:mt-20 grid sm:grid-cols-2 lg:grid-cols-5 border-t border-gray-950/10 dark:border-white/10">
                    {facts.map((f) => (
                        <div key={f.k} className={`py-6 pr-6 border-b border-gray-950/10 dark:border-white/10 lg:border-b-0 ${f.k === 'Recent stages' ? 'sm:col-span-2' : ''}`}>
                            <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">{f.k}</dt>
                            <dd className="mt-2 font-heading font-bold text-base md:text-lg leading-snug text-gray-950 dark:text-white">{f.v}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}
