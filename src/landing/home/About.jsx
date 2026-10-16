import SectionHeading from '../components/SectionHeading';

// About Newbi: a sticky statement, and the things we take off your plate as a
// stack of cards that pile up as you scroll (CSS sticky + scroll-driven settle).
const CARDS = [
    { t: 'Concept and plan', d: 'A plan, a timeline and a quote you can forward the same week.' },
    { t: 'Artists and talent', d: 'Booked, contracted, and looked after from soundcheck to the last song.' },
    { t: 'Venue, permits and production', d: 'Stage, sound, lights, fabrication and the paperwork nobody wants to do.' },
    { t: 'Creators and ambassadors', d: 'From our own network, matched by city, niche and audience, briefed and checked by us.' },
    { t: 'Crews and entry', d: 'Trained teams at the gate, backstage and in hospitality. Ticketing and guestlists handled.' },
    { t: 'Content and the report', d: 'Shot on the night. Numbers, links and photos in your inbox after.' },
];

export default function About() {
    return (
        <section id="about" aria-labelledby="about-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-24">
                <div className="lg:sticky lg:top-28 self-start">
                    <SectionHeading
                        id="about-title"
                        index="02"
                        eyebrow="About Newbi"
                        title="Plans are easy. We're the crew that"
                        highlight="runs them."
                        text="Newbi is an event marketing and live entertainment company. You bring a goal, a date and a budget. We bring everything else, run it, and report on it."
                    />
                    <p className="nb-reveal-late mt-6 max-w-xl text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">
                        We started with young audiences and still know them best. The same crew now runs product launches, corporate events, concerts and city-wide campaigns, with no sub-vendors for you to chase and one number to call before, during and after.
                    </p>
                    <p className="nb-reveal-late mt-10 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">What we take off your plate ↓</p>
                </div>

                <ul className="nb-stack space-y-[14vh] lg:space-y-[20vh] pb-[10vh]">
                    {CARDS.map((c, i) => (
                        <li key={c.t} className="nb-stack-card nb-reveal" style={{ '--i': i }}>
                            <div className="relative overflow-hidden rounded-[1.75rem] border border-gray-950/10 dark:border-white/10 bg-[#F4F2EC] dark:bg-[#0b0e13] p-7 md:p-10 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.35)]">
                                <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full" style={{ background: `radial-gradient(closest-side, rgba(57,255,20,${0.10 + i * 0.03}), transparent)` }} />
                                <div className="relative flex items-start justify-between gap-6">
                                    <span className="font-heading font-extrabold tracking-[-0.04em] text-5xl md:text-6xl nb-ghost">0{i + 1}</span>
                                    <span className="mt-2 w-3 h-3 rounded-full bg-neon-green" aria-hidden="true" />
                                </div>
                                <h3 className="relative mt-6 font-heading font-extrabold tracking-[-0.03em] text-3xl md:text-4xl lg:text-5xl leading-[0.95] text-gray-950 dark:text-white">{c.t}</h3>
                                <p className="relative mt-4 max-w-md text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{c.d}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
