import { Plus } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';

const FAQS = [
    { q: 'Which cities do you work in?', a: 'Across India. Tell us the city or campus and we will tell you how we would run it there.' },
    { q: 'How early should we get in touch?', a: 'For fests and live shows, a few weeks ahead gives you the most options. A creator campaign on its own can go live sooner.' },
    { q: 'What does a project cost?', a: 'It depends on the format, the city and the scale. Share a rough budget in the form and we plan to it.' },
    { q: 'Do you handle permissions and production?', a: 'Yes. Permissions, production, staffing and running the day are part of the job.' },
    { q: 'Can we run a creator campaign without an event?', a: 'Yes. Creator campaigns run on their own or alongside an event.' },
    { q: 'How do we see results?', a: 'Photos, content links and a short report with the numbers that matter for your goal.' },
];

// Questions brands and colleges ask before they enquire. <details> works without JavaScript.
export default function Faq() {
    return (
        <section aria-labelledby="faq-title" className="py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
                <SectionHeading id="faq-title" index="07" eyebrow="Questions" title="Before you" highlight="ask." className="lg:sticky lg:top-28 self-start" />
                <div className="nb-reveal border-t border-gray-950/10 dark:border-white/10">
                    {FAQS.map((f, i) => (
                        <details key={f.q} className="group border-b border-gray-950/10 dark:border-white/10">
                            <summary className="flex items-center gap-5 min-h-[72px] py-5 cursor-pointer">
                                <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-gray-400 dark:text-zinc-600">0{i + 1}</span>
                                <span className="flex-1 font-heading text-xl md:text-2xl font-extrabold tracking-[-0.02em] text-gray-950 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-neon-green transition-colors">{f.q}</span>
                                <span className="w-10 h-10 shrink-0 rounded-full border border-gray-950/15 dark:border-white/15 flex items-center justify-center text-gray-950 dark:text-white group-open:bg-neon-green group-open:border-neon-green group-open:text-black">
                                    <Plus size={17} className="nb-plus" aria-hidden="true" />
                                </span>
                            </summary>
                            <p className="pb-7 pl-9 pr-4 max-w-2xl text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{f.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
