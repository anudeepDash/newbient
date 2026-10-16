import { Play, ArrowUpRight } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { sizedImage } from '../links';

const monthYear = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00+05:30`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

const metaOf = (item) => [item.category, item.sector, monthYear(item.date) || item.year].filter(Boolean).join(' · ');

// The photo with the framing the team set in the admin (imageTransform: zoom and x/y offset).
function Poster({ item, eager = false }) {
    const t = item.imageTransform || {};
    return (
        <img
            src={sizedImage(item.image, 900)}
            alt={item.title}
            width="800"
            height="1000"
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `calc(50% + ${t.x || 0}%) calc(50% + ${t.y || 0}%)`, transform: `scale(${t.scale || 1})`, transformOrigin: 'center' }}
        />
    );
}

function ReelLink({ item, className = '' }) {
    if (!item.highlightUrl) return null;
    return (
        <a href={item.highlightUrl} target="_blank" rel="noopener noreferrer" className={`group/reel inline-flex items-center gap-3 min-h-[44px] ${className}`}>
            <span className="w-11 h-11 rounded-full bg-neon-green text-black flex items-center justify-center group-hover/reel:scale-110 transition-transform"><Play size={16} fill="currentColor" aria-hidden="true" /></span>
            <span className="font-heading font-bold text-base text-gray-950 dark:text-white">Watch the reel</span>
            <ArrowUpRight size={16} className="text-gray-500 dark:text-zinc-400" aria-hidden="true" />
        </a>
    );
}

/*
 * The scroll reel: titles scroll on one side while the matching poster
 * crossfades into a pinned frame on the other (on phones the frame pins at the
 * top and the titles scroll under it). Each title block owns a named view
 * timeline that drives its poster. Browsers without scroll-driven animations
 * (or with reduced motion) get the plain card grid instead.
 */
function Reel({ items }) {
    const total = String(items.length).padStart(2, '0');
    return (
        <div className="nb-work-reel hidden relative">
            {/* Pinned frame */}
            <div className="nb-reel-frame sticky top-[4.5rem] lg:top-[12vh] z-10 self-start h-[50svh] lg:h-[76vh] flex items-center justify-center lg:justify-end lg:col-start-2 lg:row-start-1 bg-[var(--bg-primary)] lg:bg-transparent pb-4 lg:pb-0">
                <div className="relative h-full aspect-[4/5] max-w-full rounded-[1.75rem] overflow-hidden bg-zinc-900 border border-gray-950/10 dark:border-white/10 shadow-[0_40px_120px_-40px_rgba(57,255,20,0.35)]">
                    {items.map((item, i) => (
                        <div key={item.id} className="nb-reel-img absolute inset-0">
                            <Poster item={item} eager={i === 0} />
                        </div>
                    ))}
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    <div aria-hidden="true" className="absolute left-4 bottom-4 flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.2em] text-white/85">
                        <span className="w-2 h-2 rounded-full bg-neon-green" /> Newbi · produced
                    </div>
                </div>
            </div>

            {/* Titles */}
            <ol className="lg:col-start-1 lg:row-start-1">
                {items.map((item, i) => {
                    const meta = metaOf(item);
                    return (
                        <li key={item.id} className="nb-reel-step min-h-[62svh] lg:min-h-[80vh] flex flex-col justify-end lg:justify-center pb-10 lg:pb-0">
                            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">
                                <span className="text-emerald-700 dark:text-neon-green">{String(i + 1).padStart(2, '0')}</span> / {total}
                            </p>
                            <h3 className="nb-reel-title mt-3 font-heading font-extrabold tracking-[-0.045em] leading-[0.9] text-[11vw] sm:text-6xl lg:text-7xl xl:text-8xl text-gray-950 dark:text-white">{item.title}</h3>
                            {meta && <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">{meta}</p>}
                            <ReelLink item={item} className="mt-5" />
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

// Fallback: the 4:5 poster cards in a row.
function Grid({ items }) {
    return (
        <ul className="nb-work-grid mt-0 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 carousel-scrollbar lg:grid lg:grid-cols-4 lg:overflow-visible" style={{ scrollPaddingLeft: '1rem' }}>
            {items.map((item, i) => (
                <li key={item.id} className={`nb-reveal shrink-0 w-[280px] sm:w-[340px] lg:w-auto snap-start ${i % 2 ? 'lg:mt-16' : ''}`}>
                    <article>
                        <div className="relative aspect-[4/5] rounded-[1.75rem] overflow-hidden bg-zinc-900 border border-gray-950/10 dark:border-white/10">
                            <Poster item={item} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                            <div className="absolute inset-x-5 bottom-5">
                                <h3 className="font-heading font-extrabold tracking-[-0.03em] leading-[0.92] text-2xl md:text-3xl text-white">{item.title}</h3>
                                {metaOf(item) && <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">{metaOf(item)}</p>}
                            </div>
                        </div>
                    </article>
                </li>
            ))}
        </ul>
    );
}

// 3–4 case studies from `portfolio` (pinned first, then the admin's order). Hidden when there are none.
export default function CaseStudies({ items = [] }) {
    if (!items.length) return null;
    return (
        <section id="work" aria-labelledby="work-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                <SectionHeading id="work-title" index="04" eyebrow="Selected work" title="Nights we" highlight="built." text="Concerts, launches and campaigns we produced and ran. Keep scrolling." />
                <div className="mt-10 md:mt-16">
                    <Reel items={items} />
                    <Grid items={items} />
                </div>
            </div>
        </section>
    );
}
