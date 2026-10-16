import { Play } from 'lucide-react';
import { sizedImage } from '../links';

// 3–4 case studies from `portfolio` (pinned first, then the admin's order). Hidden when there are none.
export default function CaseStudies({ items = [] }) {
    if (!items.length) return null;
    return (
        <section id="work" aria-labelledby="work-title" className="scroll-mt-20 py-16 md:py-24 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 id="work-title" className="nb-reveal font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-950 dark:text-white">Recent work</h2>
                {/* Phones: a swipeable row. Larger screens: a grid. */}
                <ul className={`mt-8 md:mt-10 -mx-4 px-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:gap-5 sm:overflow-visible sm:grid-cols-2 ${items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`} style={{ scrollPaddingLeft: '1rem' }}>
                    {items.map((p) => {
                        const meta = [p.category, p.sector, p.year].filter(Boolean).join(' · ');
                        return (
                            <li key={p.id} className="nb-reveal group w-[78%] shrink-0 snap-start sm:w-auto">
                                <div className="relative overflow-hidden rounded-3xl bg-gray-200 dark:bg-white/[0.05] aspect-[4/3]">
                                    <img
                                        src={sizedImage(p.image, 800)}
                                        alt={p.title}
                                        width="800"
                                        height="600"
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover md:group-hover:scale-[1.03] transition-transform duration-500"
                                    />
                                </div>
                                <h3 className="mt-4 font-heading text-lg font-bold text-gray-950 dark:text-white">{p.title}</h3>
                                {meta && <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{meta}</p>}
                                {p.highlightUrl && (
                                    <a href={p.highlightUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-gray-950 dark:text-neon-green">
                                        <Play size={15} aria-hidden="true" /> Watch the highlight
                                    </a>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
