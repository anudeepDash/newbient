import { Play, ArrowUpRight } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { sizedImage } from '../links';

const monthYear = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00+05:30`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

/*
 * One portfolio card in the 4:5 poster frame. The photo keeps the framing the
 * team set in the admin (imageTransform: zoom and x/y offset) and drifts a
 * little slower than the page as you scroll.
 */
function WorkCard({ item, index }) {
    const t = item.imageTransform || {};
    const meta = [item.category, item.sector, monthYear(item.date) || item.year].filter(Boolean).join(' · ');
    return (
        <article className="group">
            <div className="relative aspect-[4/5] rounded-[1.75rem] overflow-hidden bg-zinc-900 border border-gray-950/10 dark:border-white/10">
                <div className="nb-parallax absolute -inset-y-[8%] inset-x-0">
                    <img
                        src={sizedImage(item.image, 900)}
                        alt={item.title}
                        width="800"
                        height="1000"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `calc(50% + ${t.x || 0}%) calc(50% + ${t.y || 0}%)`, transform: `scale(${t.scale || 1})`, transformOrigin: 'center' }}
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <span className="absolute top-4 left-4 font-mono text-[11px] font-bold tracking-[0.2em] text-white/80">{String(index + 1).padStart(2, '0')}</span>
                {item.highlightUrl && (
                    <a href={item.highlightUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch the reel: ${item.title}`} className="absolute top-4 right-4 w-11 h-11 rounded-full bg-neon-green text-black flex items-center justify-center hover:scale-110 transition-transform">
                        <Play size={16} fill="currentColor" aria-hidden="true" />
                    </a>
                )}
                <div className="absolute inset-x-5 bottom-5">
                    <h3 className="font-heading font-extrabold tracking-[-0.03em] leading-[0.92] text-2xl md:text-3xl text-white">{item.title}</h3>
                    {meta && <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">{meta}</p>}
                </div>
            </div>
        </article>
    );
}

// 3–4 case studies from `portfolio` (pinned first, then the admin's order). Hidden when there are none.
export default function CaseStudies({ items = [] }) {
    if (!items.length) return null;
    return (
        <section id="work" aria-labelledby="work-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10 overflow-hidden">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <SectionHeading id="work-title" index="04" eyebrow="Selected work" title="Nights we" highlight="built." />
                    <p className="nb-reveal font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500 md:pb-3">{items.length} of many · swipe</p>
                </div>
                <ul className="mt-12 md:mt-16 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 carousel-scrollbar lg:grid lg:grid-cols-4 lg:overflow-visible" style={{ scrollPaddingLeft: '1rem' }}>
                    {items.map((item, i) => (
                        <li key={item.id} className={`nb-reveal shrink-0 w-[280px] sm:w-[340px] lg:w-auto snap-start ${i % 2 ? 'lg:mt-16' : ''}`}>
                            <WorkCard item={item} index={i} />
                        </li>
                    ))}
                </ul>
                <p className="nb-reveal mt-10 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">Full archive on request <ArrowUpRight size={14} aria-hidden="true" /></p>
            </div>
        </section>
    );
}
