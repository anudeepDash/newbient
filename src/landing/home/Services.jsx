import { GraduationCap, Music, Users, Sparkles } from 'lucide-react';

// One section for what Newbi does (replaces the old Why / About / Capabilities trio).
const SERVICES = [
    {
        icon: GraduationCap,
        title: 'College activations',
        text: 'Stalls, sampling, contests and stage moments at college fests and on campus. We handle the permissions, the setup on the day and the report after.',
        tags: ['College fests', 'Sampling', 'Campus contests'],
    },
    {
        icon: Music,
        title: 'Live shows',
        text: 'Concerts, college nights and club shows: artist booking, production, ticketing and guestlists, run by one team.',
        tags: ['Artist booking', 'Production', 'Ticketing'],
    },
    {
        icon: Users,
        title: 'Creator campaigns',
        text: 'Campaigns with creators from our own network, picked for your audience and city, with every post submitted and checked in one place.',
        tags: ['Instagram', 'Reels', 'City creators'],
    },
    {
        icon: Sparkles,
        title: 'Brand experiences',
        text: 'Pop-ups, launches and on-ground events that people turn up to and post about, planned around what your brand needs to show.',
        tags: ['Pop-ups', 'Launches', 'On-ground'],
    },
];

export default function Services() {
    return (
        <section id="services" aria-labelledby="services-title" className="scroll-mt-20 py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <div className="nb-reveal lg:sticky lg:top-28 self-start max-w-xl">
                    <h2 id="services-title" className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-950 dark:text-white">What we do</h2>
                    <p className="mt-3 text-base md:text-lg text-gray-600 dark:text-zinc-400">
                        Four things, done end to end. Most projects mix two or three of them.
                    </p>
                </div>
                {/* The cards stack on top of each other as you scroll (position: sticky, no JavaScript). */}
                <ul className="grid gap-4 md:gap-6">
                    {SERVICES.map((s, i) => (
                        <li
                            key={s.title}
                            className="sticky p-6 md:p-8 rounded-3xl bg-white dark:bg-[#0c0e13] border border-black/[0.07] dark:border-white/[0.08] shadow-[0_-12px_40px_-24px_rgba(0,0,0,0.35)]"
                            style={{ top: `calc(5rem + env(safe-area-inset-top, 0px) + ${i * 14}px)` }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <span className="w-11 h-11 rounded-xl bg-neon-green/15 text-gray-950 dark:text-neon-green flex items-center justify-center">
                                    <s.icon size={21} aria-hidden="true" />
                                </span>
                                <span className="font-mono text-sm font-semibold text-gray-300 dark:text-zinc-700" aria-hidden="true">0{i + 1}</span>
                            </div>
                            <h3 className="mt-5 font-heading text-xl md:text-2xl font-bold text-gray-950 dark:text-white">{s.title}</h3>
                            <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-zinc-400">{s.text}</p>
                            <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${s.title} includes`}>
                                {s.tags.map((t) => (
                                    <li key={t} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-[13px] font-medium text-gray-700 dark:text-zinc-300">{t}</li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
