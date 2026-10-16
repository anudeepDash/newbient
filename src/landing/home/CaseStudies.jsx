import { Play, ArrowUpRight, Clock } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { sizedImage } from '../links';

const monthYear = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00+05:30`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

/*
 * One portfolio card, in the original 4:5 cinematic style. The photo keeps the
 * framing the team set for it in the admin (imageTransform: zoom and x/y
 * offset), so artist photos sit exactly as they were positioned there.
 */
function WorkCard({ item }) {
    const t = item.imageTransform || {};
    const when = monthYear(item.date);
    return (
        <article className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-gray-100 dark:bg-zinc-950 border border-black/10 dark:border-white/5 shadow-md dark:shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 overflow-hidden bg-black">
                <img
                    src={sizedImage(item.image, 900)}
                    alt={item.title}
                    width="800"
                    height="1000"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        objectPosition: `calc(50% + ${t.x || 0}%) calc(50% + ${t.y || 0}%)`,
                        transform: `scale(${t.scale || 1})`,
                        transformOrigin: 'center',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/0" />
            </div>

            <div className="absolute top-5 left-5 right-5 flex items-start justify-between gap-3">
                {item.category && (
                    <span className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-white/15 text-[10px] font-black uppercase tracking-[0.25em] text-neon-green">{item.category}</span>
                )}
                {item.year && (
                    <span className="ml-auto px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/80">
                        <Clock size={11} aria-hidden="true" /> {item.year}
                    </span>
                )}
            </div>

            <div className="absolute inset-x-5 bottom-6">
                <h3 className="font-heading text-2xl md:text-3xl font-extrabold leading-none tracking-tight text-white line-clamp-2">{item.title}</h3>
                {(when || item.sector) && (
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/55">{[item.sector, when].filter(Boolean).join(' · ')}</p>
                )}
                <div className="mt-5 pt-4 border-t border-white/10 min-h-[44px] flex items-center">
                    {item.highlightUrl ? (
                        <a href={item.highlightUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 min-h-[44px]">
                            <span className="w-9 h-9 rounded-xl bg-neon-green text-black flex items-center justify-center"><Play size={14} fill="black" aria-hidden="true" /></span>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/85">Watch the reel</span>
                            <ArrowUpRight size={14} className="text-white/50" aria-hidden="true" />
                        </a>
                    ) : (
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Produced by Newbi</span>
                    )}
                </div>
            </div>
        </article>
    );
}

// 3–4 case studies from `portfolio` (pinned first, then the admin's order). Hidden when there are none.
export default function CaseStudies({ items = [] }) {
    if (!items.length) return null;
    return (
        <section id="work" aria-labelledby="work-title" className="scroll-mt-20 py-20 md:py-28 border-t border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    id="work-title"
                    eyebrow="Our work"
                    title="Our"
                    highlight="impact."
                    text="Concerts, college fests and brand activations we have produced and run. Swipe through a few recent ones."
                />
                <ul className="mt-12 md:mt-14 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 flex gap-5 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 carousel-scrollbar" style={{ scrollPaddingLeft: '1rem' }}>
                    {items.map((item) => (
                        <li key={item.id} className="nb-reveal shrink-0 w-[280px] sm:w-[360px] md:w-[380px] snap-start">
                            <WorkCard item={item} />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
