import SectionHeading from '../components/SectionHeading';

const STEPS = [
    { t: 'Brief', d: 'Tell us the goal, the audience, the city and the budget. A form or a call, whichever is faster.' },
    { t: 'Plan', d: 'We come back with a plan, a timeline and a quote. You see exactly what happens and when.' },
    { t: 'Run', d: 'Our crew runs it: artists, production, creators, entry. You get updates as it happens, not a week later.' },
    { t: 'Report', d: 'Photos, content links and the numbers that matter for your goal, in one short report.' },
];

// How a night comes together: the green line draws itself as you scroll, and
// each step lights up as it passes the middle of the screen.
export default function Process() {
    return (
        <section aria-labelledby="process-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                <SectionHeading
                    id="process-title"
                    index="02"
                    eyebrow="How it works"
                    title="From a brief to a"
                    highlight="full room."
                    text="Four steps, one point of contact. You never chase three vendors for one answer."
                    className="lg:sticky lg:top-28 self-start"
                />
                <ol className="relative pl-10 md:pl-14">
                    <span aria-hidden="true" className="absolute left-[11px] md:left-[15px] top-2 bottom-2 w-px bg-gray-950/10 dark:bg-white/10" />
                    <span aria-hidden="true" className="nb-line absolute left-[11px] md:left-[15px] top-2 bottom-2 w-px bg-neon-green" />
                    {STEPS.map((s, i) => (
                        <li key={s.t} className="relative py-8 md:py-12 first:pt-0 last:pb-0">
                            <span aria-hidden="true" className="nb-step-dot absolute -left-10 md:-left-14 top-8 md:top-12 first:top-0 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-gray-950/20 dark:border-white/25 bg-[var(--bg-primary)]" style={i === 0 ? { top: 0 } : undefined} />
                            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">Step 0{i + 1}</p>
                            <h3 className="mt-2 font-heading font-black uppercase tracking-[-0.03em] text-4xl md:text-6xl text-gray-950 dark:text-white">{s.t}</h3>
                            <p className="mt-3 max-w-lg text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{s.d}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
