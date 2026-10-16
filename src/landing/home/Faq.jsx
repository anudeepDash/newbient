import { Plus } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';

const FAQS = [
    { q: 'Which cities do you work in?', a: 'Across India. Tell us the city or campus and we will tell you how we would run it there.' },
    { q: 'How early should we get in touch?', a: 'For college fests and live shows, four to six weeks gives you the most options. A creator campaign on its own can go live sooner.' },
    { q: 'What does a project cost?', a: 'It depends on the format, the city and the scale. Share a rough budget in the form and we will plan to it.' },
    { q: 'Do you handle permissions and production?', a: 'Yes. Permissions, production, staffing and running things on the day are part of what we do.' },
    { q: 'Can we run a creator campaign without an event?', a: 'Yes. Creator campaigns can run on their own or alongside an event or activation.' },
    { q: 'How do we see the results?', a: 'You get the photos, the content links and a short report with the numbers that matter for your goal.' },
];

// Questions brands and colleges ask before they enquire. <details> works without JavaScript.
export default function Faq() {
    return (
        <section aria-labelledby="faq-title" className="py-20 md:py-28 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <SectionHeading id="faq-title" eyebrow="Questions" title="Before you" highlight="ask." text="The things brands and colleges usually want to know first." />
                <div className="nb-reveal divide-y divide-black/[0.07] dark:divide-white/[0.07] border-y border-black/[0.07] dark:border-white/[0.07]">
                    {FAQS.map((f) => (
                        <details key={f.q} className="group">
                            <summary className="flex items-center justify-between gap-4 min-h-[64px] py-4 cursor-pointer font-heading text-lg md:text-xl font-bold text-gray-950 dark:text-white">
                                {f.q}
                                <span className="w-9 h-9 shrink-0 rounded-full border border-black/10 dark:border-white/15 flex items-center justify-center group-open:bg-neon-green group-open:border-neon-green group-open:text-black">
                                    <Plus size={17} className="nb-chevron" aria-hidden="true" />
                                </span>
                            </summary>
                            <p className="pb-6 pr-12 text-[15px] leading-relaxed text-gray-600 dark:text-zinc-400">{f.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
