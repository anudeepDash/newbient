import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { APP_LINKS } from '../links';

// The company behind the shows: Newbi Entertainment & Marketing LLP and its three arms.
const ARMS = [
    { name: 'Newbi Entertainment', does: 'Concerts, launches, fests, club nights and corporate events, with artist booking and technical production in-house.', to: '/#work', label: 'See the shows' },
    { name: 'Newbi Marketing', does: 'Brand activations, influencer and ambassador campaigns, digital and social, in the city and on campus.', to: '/#services', label: 'What we run' },
    { name: 'Newbi Media', does: 'Content and social media management, plus ConcertZone, our live-music magazine.', href: '/concertzone', label: 'Read ConcertZone' },
];

export default function About({ recentStages = [], openCampaigns = 0, upcomingCount = 0 }) {
    const facts = [
        recentStages.length > 0 && { k: 'Recent stages', v: recentStages.join(', ') },
        openCampaigns > 0 && { k: 'Open now', v: `${openCampaigns} creator ${openCampaigns === 1 ? 'campaign' : 'campaigns'}` },
        upcomingCount > 0 && { k: 'Coming up', v: `${upcomingCount} public ${upcomingCount === 1 ? 'event' : 'events'}` },
        { k: 'Company', v: 'Newbi Entertainment & Marketing LLP' },
        { k: 'Where', v: 'India, wherever the crowd is' },
    ].filter(Boolean);

    return (
        <section id="about" aria-labelledby="about-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                    <SectionHeading
                        id="about-title"
                        index="02"
                        eyebrow="About Newbi"
                        title="Your end-to-end"
                        highlight="execution partner."
                        text="Brands hire Newbi to turn a plan into a launch, a night or a campaign that actually happens: artists booked, zones built, creators briefed, crews trained and the numbers reported after. We started with young audiences and still know them best, but the same crew runs corporate events, product launches and city-wide campaigns."
                    />
                    <dl className="nb-reveal-late mt-10 border-t border-gray-950/10 dark:border-white/10">
                        {facts.map((f) => (
                            <div key={f.k} className="grid grid-cols-[7rem_1fr] md:grid-cols-[9rem_1fr] gap-4 py-4 border-b border-gray-950/10 dark:border-white/10">
                                <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 pt-1">{f.k}</dt>
                                <dd className="font-heading font-semibold text-base md:text-lg text-gray-950 dark:text-white">{f.v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <ul className="grid gap-4 self-start">
                    {ARMS.map((a, i) => {
                        const Arrow = a.href ? ArrowUpRight : ArrowRight;
                        const inner = (
                            <>
                                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">0{i + 1}</span>
                                <span className="mt-4 block font-heading text-2xl md:text-3xl font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{a.name}</span>
                                <span className="mt-2 block text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{a.does}</span>
                                <span className="mt-6 inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-gray-950 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-neon-green">{a.label} <Arrow size={16} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" /></span>
                            </>
                        );
                        const cls = 'group block p-7 md:p-9 rounded-[1.75rem] border border-gray-950/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] hover:border-gray-950/30 dark:hover:border-neon-green/40 transition-colors';
                        return (
                            <li key={a.name} className="nb-reveal">
                                {a.href ? <a href={a.href} className={cls}>{inner}</a> : <Link to={a.to} className={cls}>{inner}</Link>}
                            </li>
                        );
                    })}
                    <li className="nb-reveal-late px-2 pt-2 text-sm text-gray-500 dark:text-zinc-500">
                        Creators and the community have their own side of Newbi too: <a href={APP_LINKS.home} className="underline underline-offset-4 decoration-neon-green text-gray-950 dark:text-white">see how that works</a>.
                    </li>
                </ul>
            </div>
        </section>
    );
}
