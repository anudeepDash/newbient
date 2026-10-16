import Sticker from '../components/Sticker';
import SectionLabel from '../components/SectionLabel';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import WorkPoster from '../components/WorkPoster';

/*
 * Nights we built: a cinematic film strip on a black stage. The section pins
 * and the posters slide past with the scroll (staggered up and down like
 * frames on a reel), ending on "And many more" with a link to the archive.
 * Without scroll-driven animations, or with reduced motion, it is a swipeable
 * row instead.
 */
export default function CaseStudies({ items = [] }) {
    if (!items.length) return null;
    return (
        <section id="work" aria-labelledby="work-title" className="nb-film scroll-mt-20 relative bg-black text-white [--nb-ghost:rgba(255,255,255,0.4)]" style={{ '--n': items.length + 1 }}>
            <div className="nb-film-pin relative overflow-hidden">
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 50% at 50% 110%, rgba(57,255,20,0.14), transparent 70%)' }} />

                <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-20 md:pt-24">
                    <div className="flex items-end justify-between gap-6">
                        <div>
                            <SectionLabel index="04" dark>Selected work</SectionLabel>
                            <h2 id="work-title" className="mt-4 font-heading font-extrabold tracking-[-0.04em] leading-[0.9] text-[2.6rem] sm:text-6xl lg:text-7xl">
                                Nights we <Sticker subtle>built.</Sticker>
                            </h2>
                        </div>
                        <Link to="/work" className="hidden sm:inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/20 font-heading font-bold text-sm hover:bg-white hover:text-black transition-colors shrink-0">
                            Full archive <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    </div>
                </div>

                <ol className="nb-film-track relative flex items-start gap-6 md:gap-10 px-4 sm:px-6 lg:px-10 pt-10 md:pt-12 pb-16 overflow-x-auto snap-x snap-mandatory carousel-scrollbar">
                    {items.map((item, i) => (
                        <li key={item.id} className={`nb-film-frame shrink-0 snap-start w-[60vw] sm:w-[36vw] lg:w-[min(24vw,320px)] ${i % 2 ? 'nb-film-low' : ''}`}>
                            <WorkPoster item={item} index={i} eager={i < 2} />
                        </li>
                    ))}
                    {/* A size container: everything in the card scales with its width (cqw), so it fits at any poster size. */}
                    <li className={`nb-film-frame shrink-0 snap-start w-[60vw] sm:w-[36vw] lg:w-[min(24vw,320px)] [container-type:inline-size] ${items.length % 2 ? 'nb-film-low' : ''}`}>
                                                <Link to="/work" className="group flex flex-col justify-between aspect-[4/5] rounded-[1.5rem] border border-dashed border-white/25 p-[9cqw] hover:border-neon-green hover:bg-white/[0.03] transition-colors">
                            <span className="font-mono text-[clamp(9px,4cqw,11px)] font-bold uppercase tracking-[0.28em] text-zinc-500">The archive</span>
                            <span>
                                <span className="block font-heading font-extrabold tracking-[-0.045em] leading-[0.9] text-[17cqw]">And many <span className="text-neon-green">more.</span></span>
                                <span className="mt-[7cqw] inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-neon-green px-[6cqw] py-[3.5cqw] font-heading text-[clamp(11px,5.4cqw,14px)] font-bold text-black transition-transform group-hover:scale-[1.03]">
                                    Full archive <ArrowRight size={14} aria-hidden="true" />
                                </span>
                            </span>
                        </Link>
                    </li>
                </ol>

                <div aria-hidden="true" className="nb-film-progress hidden absolute inset-x-0 bottom-0 h-1 bg-white/10">
                    <div className="nb-film-bar h-full w-full bg-neon-green" />
                </div>
            </div>
        </section>
    );
}
