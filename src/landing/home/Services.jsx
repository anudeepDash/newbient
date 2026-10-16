import { GraduationCap, Music, Users, Sparkles, Check } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';

// One section for what Newbi does (replaces the old Why / About / Capabilities trio).
const SERVICES = [
    {
        icon: GraduationCap,
        title: 'College activations',
        text: 'Put your brand inside college fests and campuses, run by a team that knows how campuses work.',
        handles: ['Fest partnerships and permissions', 'Stalls, sampling and on-ground staff', 'Contests and stage moments', 'Photos, footfall and a post-event report'],
    },
    {
        icon: Music,
        title: 'Live shows and concerts',
        text: 'Concerts, college nights and club shows, from booking the artist to the last guest out.',
        handles: ['Artist booking and hospitality', 'Stage, sound and lights', 'Ticketing, guestlists and QR entry', 'Promotion to the right crowd'],
    },
    {
        icon: Users,
        title: 'Creator campaigns',
        text: 'Creators from our own network, picked by city, niche and audience, with every post checked before it counts.',
        handles: ['Shortlists by city and niche', 'Briefs and approvals', 'Reels, stories and event coverage', 'Links, proof and a results summary'],
    },
    {
        icon: Sparkles,
        title: 'Brand experiences',
        text: 'Launches, pop-ups and on-ground moments that people turn up for and post about.',
        handles: ['Concept and planning', 'Venue, build and staffing', 'Creator and community invites', 'Content captured on the day'],
    },
];

const STEPS = [
    { title: 'Brief', text: 'Tell us the goal, the audience, the city and the budget.' },
    { title: 'Plan', text: 'We come back with a plan, a timeline and a quote.' },
    { title: 'Run', text: 'Our team runs it, on the ground and online.' },
    { title: 'Report', text: 'You get the photos, the links and the numbers that matter.' },
];

export default function Services() {
    return (
        <section id="services" aria-labelledby="services-title" className="scroll-mt-20 py-20 md:py-28 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    id="services-title"
                    eyebrow="What we do"
                    title="Four ways we put you in front of"
                    highlight="young India."
                    text="Most projects mix two or three of these. One team handles all of it, so nothing falls between agencies."
                />

                <ul className="mt-12 md:mt-16 grid gap-4 md:gap-5 md:grid-cols-2">
                    {SERVICES.map((s, i) => (
                        <li key={s.title} className="nb-reveal group relative flex flex-col p-6 sm:p-8 md:p-10 rounded-[2rem] bg-white dark:bg-[#0b0e14] border border-black/[0.07] dark:border-white/[0.07] hover:border-black/20 dark:hover:border-neon-green/40 transition-colors overflow-hidden">
                            <div aria-hidden="true" className="absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'radial-gradient(closest-side, rgba(57,255,20,0.12), transparent)' }} />
                            <div className="relative flex items-center justify-between">
                                <span className="w-12 h-12 rounded-2xl bg-gray-950 text-neon-green dark:bg-white/[0.06] flex items-center justify-center">
                                    <s.icon size={22} aria-hidden="true" />
                                </span>
                                <span className="font-heading text-4xl md:text-5xl font-black text-gray-200 dark:text-white/[0.06]" aria-hidden="true">0{i + 1}</span>
                            </div>
                            <h3 className="relative mt-6 font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white">{s.title}</h3>
                            <p className="relative mt-3 text-[15px] md:text-base leading-relaxed text-gray-600 dark:text-zinc-400">{s.text}</p>
                            <ul className="relative mt-6 pt-6 border-t border-black/[0.06] dark:border-white/[0.06] grid gap-2.5 sm:grid-cols-2" aria-label={`${s.title}: what we handle`}>
                                {s.handles.map((h) => (
                                    <li key={h} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-zinc-300">
                                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-neon-green" aria-hidden="true" />
                                        {h}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>

                <div className="nb-reveal mt-6 md:mt-8 rounded-[2rem] bg-gray-950 text-white dark:bg-white/[0.03] dark:border dark:border-white/[0.07] p-6 sm:p-8 md:p-10">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-neon-green">How a project runs</h3>
                    <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {STEPS.map((step, i) => (
                            <li key={step.title} className="relative">
                                <span className="font-heading text-sm font-black text-zinc-500">Step 0{i + 1}</span>
                                <p className="mt-1 font-heading text-xl font-extrabold">{step.title}</p>
                                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}
