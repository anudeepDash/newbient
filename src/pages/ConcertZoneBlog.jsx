import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Newspaper from 'lucide-react/dist/esm/icons/newspaper';
import { cn } from '../lib/utils';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import BlogNewsletter from '../components/blog/BlogNewsletter';
import AdSenseSlot from '../components/blog/AdSenseSlot';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { TEST_POSTS } from './concertzone/testPosts';
import { CATEGORIES, CzShell, StoryCard, PostMedia, CategoryChip, Meta, Label, postPath, formatDate } from './concertzone/czShared';

// Only where an ad unit is configured: an empty slot would leave a blank gap.
const AdSlot = ({ className = '', slot = '' }) => (slot
    ? <AdSenseSlot className={className} adSlot={slot} adFormat="horizontal" style={{ display: 'block', minHeight: '96px' }} />
    : null);

const ROTATE_MS = 8000;

// The featured story rotates every few seconds (not for people who prefer reduced motion,
// and not while the pointer or keyboard focus is on it).
function useRotation(count) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        setReduced(Boolean(mq?.matches));
    }, []);
    useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);
    useEffect(() => {
        if (count <= 1 || paused || reduced) return undefined;
        const t = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
        return () => clearTimeout(t);
    }, [count, index, paused, reduced]);
    const running = count > 1 && !paused && !reduced;
    return { index: Math.min(index, Math.max(count - 1, 0)), setIndex, setPaused, running };
}

const ConcertZoneBlog = () => {
    useStoreSubscription(['posts']);
    useDynamicMeta({ page: 'concertzone', url: window.location.href });

    const { category } = useParams();
    const navigate = useNavigate();
    const { posts, siteSettings } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(9);

    const layout = siteSettings?.concertzone || {};
    const eyebrow = [layout.mastheadVol || 'Vol 01', layout.heroSubtitle || 'Music, life & culture'].filter(Boolean).join(' · ');
    const tickerItems = (siteSettings?.blogTicker?.length ? siteSettings.blogTicker : [
        "Welcome to ConcertZone, India's music culture hub",
        'New artist spotlights every week',
        'Submit your story: editorial@newbi.live',
    ]).filter(Boolean);

    const activeCategory = CATEGORIES.some((c) => c.id === category) ? category : 'all';
    const activeLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label;

    useEffect(() => { setVisibleCount(9); }, [activeCategory, searchQuery]);

    const filteredPosts = useMemo(() => {
        let result = posts.filter((p) => p.status === 'Published');
        if (result.length === 0) result = [...TEST_POSTS];
        if (activeCategory !== 'all') result = result.filter((p) => p.category === activeLabel);
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            result = result.filter((p) =>
                p.title?.toLowerCase().includes(q) || p.shortDescription?.toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    }, [posts, activeCategory, activeLabel, searchQuery]);

    // While searching, show plain results: no featured split.
    const searching = Boolean(searchQuery.trim());
    const featuredPosts = useMemo(() => {
        if (searching) return [];
        const featured = filteredPosts.filter((p) => p.featured);
        return (featured.length > 0 ? featured : filteredPosts).slice(0, 4);
    }, [filteredPosts, searching]);

    const { index: leadIndex, setIndex: setLeadIndex, setPaused, running } = useRotation(featuredPosts.length);
    const leadPost = featuredPosts[leadIndex];
    const restPosts = filteredPosts.filter((p) => !featuredPosts.some((f) => f.id === p.id));
    const gridPosts = restPosts.slice(0, visibleCount);

    const goCategory = (id) => navigate(id === 'all' ? '/concertzone' : `/concertzone/${id}`);

    return (
        <CzShell>
            {/* Masthead */}
            <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-10 md:pt-16 pb-8">
                <Label>{eyebrow}</Label>
                <h1 className="mt-3 font-heading font-extrabold tracking-[-0.05em] leading-[0.88] text-[13.5vw] sm:text-[11vw] lg:text-[9.5rem] text-gray-950 dark:text-white">
                    {activeCategory === 'all' ? (
                        <>Concert<span className="text-gray-400 dark:text-zinc-600">Zone</span><span className="text-[var(--cz-accent)] [-webkit-text-stroke:2px_rgba(0,0,0,0.3)] dark:[-webkit-text-stroke:0]">.</span></>
                    ) : (
                        <>{activeLabel}<span className="text-[var(--cz-accent)] [-webkit-text-stroke:2px_rgba(0,0,0,0.3)] dark:[-webkit-text-stroke:0]">.</span></>
                    )}
                </h1>
                <p className="mt-5 max-w-xl text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">
                    {activeCategory === 'all'
                        ? "India's music culture, written down: live events, artists, guides and the buzz."
                        : `Every ${activeLabel.toLowerCase()} story on ConcertZone, newest first.`}
                </p>
            </section>

            {/* Ticker */}
            {tickerItems.length > 0 && (
                <div className="border-y border-black/[0.08] dark:border-white/10 h-11 overflow-hidden flex items-center" aria-label="ConcertZone news">
                    <div className="flex whitespace-nowrap animate-marquee motion-reduce:animate-none">
                        {[0, 1, 2, 3].map((n) => (
                            <div key={n} className="flex items-center gap-6 pr-6" aria-hidden={n > 0 ? 'true' : undefined}>
                                {tickerItems.map((item, i) => (
                                    <React.Fragment key={i}>
                                        <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gray-700 dark:text-zinc-300">{item}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--cz-accent)]" />
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-20">
                {/* Sections + search */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-10">
                    <div role="group" aria-label="Sections" className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => goCategory(c.id)}
                                aria-pressed={activeCategory === c.id}
                                className={cn(
                                    'shrink-0 min-h-[44px] px-5 rounded-full text-sm font-semibold transition-colors ring-1 ring-inset',
                                    activeCategory === c.id
                                        ? 'bg-gray-950 text-white ring-gray-950 dark:bg-white dark:text-black dark:ring-white'
                                        : 'bg-white/60 dark:bg-white/[0.04] text-gray-700 dark:text-zinc-300 ring-black/10 dark:ring-white/15 hover:ring-black/30 dark:hover:ring-white/40'
                                )}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative lg:ml-auto lg:w-80">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none" aria-hidden="true" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search stories"
                            aria-label="Search stories"
                            className="w-full h-12 pl-11 pr-11 rounded-full bg-white dark:bg-white/[0.04] ring-1 ring-inset ring-black/10 dark:ring-white/15 text-base text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--cz-accent)] [&::-webkit-search-cancel-button]:hidden"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-950 dark:hover:text-white">
                                <X size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Lead story + the other featured stories */}
                {leadPost && (
                    <section aria-label="Featured" className="grid gap-6 lg:grid-cols-[1.75fr_1fr] mb-14">
                        <Link
                            to={postPath(leadPost)}
                            onMouseEnter={() => setPaused(true)}
                            onMouseLeave={() => setPaused(false)}
                            onFocus={() => setPaused(true)}
                            onBlur={() => setPaused(false)}
                            className="group relative block overflow-hidden rounded-[1.75rem] aspect-[4/5] sm:aspect-[16/10] bg-zinc-900 ring-1 ring-black/10 dark:ring-white/10"
                        >
                            <PostMedia key={leadPost.id} post={leadPost} video eager className="transition-transform duration-[1200ms] group-hover:scale-[1.03]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-10 text-white">
                                {leadPost.category && <CategoryChip>{leadPost.category}</CategoryChip>}
                                <h2 className="mt-4 max-w-3xl font-heading font-extrabold tracking-[-0.03em] leading-[1.02] text-[2rem] sm:text-5xl lg:text-6xl">
                                    {leadPost.title}
                                </h2>
                                {leadPost.shortDescription && (
                                    <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-white/80 line-clamp-3 sm:line-clamp-2">{leadPost.shortDescription}</p>
                                )}
                                <Meta post={leadPost} className="mt-4 text-white/70" />
                            </div>
                        </Link>

                        {featuredPosts.length > 1 && (
                            <div className="flex flex-col">
                                <Label className="mb-2">Featured</Label>
                                <ol className="flex flex-col divide-y divide-black/[0.08] dark:divide-white/10 border-y border-black/[0.08] dark:border-white/10">
                                    {featuredPosts.map((post, idx) => {
                                        const active = idx === leadIndex;
                                        return (
                                            <li key={post.id} className="relative">
                                                <Link
                                                    to={postPath(post)}
                                                    onMouseEnter={() => { setLeadIndex(idx); setPaused(true); }}
                                                    onMouseLeave={() => setPaused(false)}
                                                    className="group flex items-center gap-4 py-4"
                                                >
                                                    <span className={cn('w-20 h-14 sm:w-24 sm:h-16 shrink-0 overflow-hidden rounded-xl bg-gray-200 dark:bg-zinc-900 transition-opacity', active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')}>
                                                        <PostMedia post={post} />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">{post.category}{post.publishDate && ` · ${formatDate(post.publishDate)}`}</span>
                                                        <span className={cn('mt-1 block font-heading font-bold leading-snug line-clamp-2 transition-colors', active ? 'text-gray-950 dark:text-white' : 'text-gray-600 dark:text-zinc-400 group-hover:text-gray-950 dark:group-hover:text-white')}>
                                                            {post.title}
                                                        </span>
                                                    </span>
                                                </Link>
                                                {active && (
                                                    <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-0.5 overflow-hidden">
                                                        <span
                                                            key={`${leadIndex}-${running}`}
                                                            className={cn('block h-full bg-[var(--cz-accent)] origin-left', running && 'animate-[czProgress_8s_linear_forwards]')}
                                                            style={running ? undefined : { transform: 'scaleX(1)' }}
                                                        />
                                                    </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        )}
                    </section>
                )}

                <AdSlot className="mb-14" slot={import.meta.env.VITE_ADSENSE_SLOT_HUB_TOP} />

                {/* Everything else */}
                {gridPosts.length > 0 && (
                    <section aria-labelledby="cz-latest" className="mb-16">
                        <div className="flex items-baseline justify-between gap-4 mb-6">
                            <h2 id="cz-latest" className="font-heading text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">
                                {searching ? `Results for “${searchQuery.trim()}”` : 'Latest stories'}
                            </h2>
                            <Label>{restPosts.length} {restPosts.length === 1 ? 'story' : 'stories'}</Label>
                        </div>
                        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {gridPosts.map((post) => <li key={post.id}><StoryCard post={post} /></li>)}
                        </ul>
                        {restPosts.length > visibleCount && (
                            <div className="flex justify-center mt-10">
                                <button
                                    type="button"
                                    onClick={() => setVisibleCount((n) => n + 9)}
                                    className="h-12 px-7 inline-flex items-center gap-2 rounded-full bg-gray-950 text-white dark:bg-white dark:text-black font-heading font-bold hover:scale-[1.03] active:scale-[0.98] transition"
                                >
                                    More stories <ArrowRight size={16} aria-hidden="true" />
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {filteredPosts.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                            <Newspaper size={22} className="text-gray-500" aria-hidden="true" />
                        </div>
                        <h2 className="font-heading text-xl font-extrabold">No stories found</h2>
                        <p className="mt-1 text-gray-600 dark:text-zinc-400">Try another section or a different search.</p>
                        {(searching || activeCategory !== 'all') && (
                            <button type="button" onClick={() => { setSearchQuery(''); goCategory('all'); }} className="mt-6 h-12 px-6 rounded-full ring-1 ring-black/15 dark:ring-white/20 font-semibold hover:bg-black/5 dark:hover:bg-white/10">
                                Show all stories
                            </button>
                        )}
                    </div>
                )}

                <AdSlot className="mb-14" slot={import.meta.env.VITE_ADSENSE_SLOT_HUB_BOTTOM} />

                <BlogNewsletter />
            </div>
        </CzShell>
    );
};

export default ConcertZoneBlog;
