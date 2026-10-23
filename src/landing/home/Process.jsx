import SectionHeading from '../components/SectionHeading';
import StackCards from '../components/StackCards';

const STEPS = [
    { t: 'Brief', d: 'Tell us the goal, the audience, the city and the budget. A form or a call, whichever is faster.' },
    { t: 'Plan', d: 'We come back with a plan, a timeline and a quote. You see exactly what happens and when.' },
    { t: 'Run', d: 'Our crew runs it: artists, production, creators, staffing, entry. You get updates as it happens, not a week later.' },
    { t: 'Report', d: 'Photos, content links and the numbers that matter for your goal, in one short report.' },
];

// How a project comes together: the four steps pile up as cards while the
// heading stays put.
export default function Process() {
    return (
        <section aria-labelledby="process-title" className="py-24 md:py-36 lg:pb-24 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
                <SectionHeading
                    id="process-title"
                    index="04"
                    eyebrow="How it works"
                    title="From a brief to a"
                    highlight="full room."
                    text="Four steps, one point of contact. You never chase three vendors for one answer."
                    className="lg:sticky lg:top-28 self-start"
                />
                <StackCards items={STEPS} />
            </div>
        </section>
    );
}
