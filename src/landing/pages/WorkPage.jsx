import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import WorkPoster from '../components/WorkPoster';
import { ARCHIVE_URL } from '../links';

// One fetch of the (edge-cached) archive per page load.
function useArchive() {
    const [state, setState] = useState({ items: null, categories: [] });
    useEffect(() => {
        let alive = true;
        fetch(ARCHIVE_URL, { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (alive) setState(j?.success ? { items: j.items || [], categories: j.categories || [] } : { items: [], categories: [] }); })
            .catch(() => { if (alive) setState({ items: [], categories: [] }); });
        return () => { alive = false; };
    }, []);
    return state;
}

/*
 * newbi.live/work: every show, launch and campaign in the portfolio, as 4:5
 * posters with the framing set in the admin, filterable by category.
 */
export default function WorkPage() {
    const { items, categories } = useArchive();
    const [filter, setFilter] = useState('All');
    const shown = useMemo(() => (items || []).filter((i) => filter === 'All' || i.category === filter), [items, filter]);
    const chips = ['All', ...categories];

    return (
        <div className="bg-black text-white min-h-dvh [--nb-ghost:rgba(255,255,255,0.4)]">
            <section className="relative overflow-hidden">
                <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(60% 60% at 80% 0%, rgba(57,255,20,0.14), transparent 70%)' }} />
                <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 md:pt-24 pb-10">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">The archive</p>
                    <h1 className="mt-4 font-heading font-extrabold tracking-[-0.045em] leading-[0.9] text-[13vw] sm:text-[9vw] lg:text-[7vw]">
                        Every night <span className="nb-ghost">we've</span> <span className="text-neon-green">built.</span>
                    </h1>
                    <p className="mt-6 max-w-xl text-lg text-zinc-400">Concerts, launches, fests and campaigns Newbi has produced and run. Tap the green button on a poster to watch its reel.</p>

                    {chips.length > 1 && (
                        <div role="group" aria-label="Filter by category" className="mt-10 flex flex-wrap gap-2">
                            {chips.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFilter(c)}
                                    aria-pressed={filter === c}
                                    className={`min-h-[44px] px-5 rounded-full border text-sm font-semibold transition-colors ${filter === c ? 'bg-neon-green border-neon-green text-black' : 'border-white/20 text-white hover:border-white/50'}`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section aria-label="Archive" className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-24">
                {items === null ? (
                    <ul className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
                        {Array.from({ length: 8 }).map((_, i) => <li key={i} className="aspect-[4/5] rounded-[1.5rem] bg-white/[0.04] animate-pulse" />)}
                    </ul>
                ) : shown.length ? (
                    <>
                        <p className="mb-6 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">{shown.length} {shown.length === 1 ? 'project' : 'projects'}</p>
                        <ul className="grid gap-x-4 gap-y-10 md:gap-x-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {shown.map((item, i) => (
                                <li key={item.id} className="nb-reveal"><WorkPoster item={item} index={i} eager={i < 4} /></li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <p className="text-zinc-400">Nothing in this category yet.</p>
                )}

                <div className="mt-20 pt-10 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <p className="font-heading font-extrabold tracking-[-0.03em] text-3xl md:text-4xl">Want your night on this page?</p>
                    <Link to="/#enquire" className="self-start inline-flex items-center gap-2 h-14 px-8 rounded-full bg-neon-green text-black font-heading font-bold hover:scale-[1.03] transition-transform">
                        Work with us <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
