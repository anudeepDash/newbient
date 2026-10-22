import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import { useStore } from '../../lib/store';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';
import { useConsent } from '../../lib/consent';

/*
 * ConcertZone is its own brand (its own header, wordmark and footer), so it
 * never shows the Newbi navbar. Links back to newbi.live are full page loads:
 * the landing site is a separate, prerendered entry.
 */

export const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'live-events', label: 'Live Events' },
    { id: 'artists', label: 'Artists' },
    { id: 'guides', label: 'Guides' },
    { id: 'buzz', label: 'Buzz' },
];

const DEFAULT_ACCENT = '#00F0FF';
export const EDITORIAL_EMAIL = 'editorial@newbi.live';

// Same slug rule the posts were published with (only the first space), so old links keep working.
export const categorySlug = (post) => post?.category?.toLowerCase().replace(' ', '-') || 'news';
export const postPath = (post) => `/concertzone/${categorySlug(post)}/${post.slug}`;

export const formatDate = (value, opts = { month: 'short', day: 'numeric' }) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, opts);
};

export const isRawVideo = (url) => {
    if (!url) return false;
    return !!(url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('cloudinary.com') || url.includes('firebasestorage.googleapis.com'));
};

export const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    let id = '';
    if (url.includes('youtube.com/watch?v=')) id = url.split('v=')[1]?.split('&')[0];
    else if (url.includes('youtu.be/')) id = url.split('/').pop();
    else if (url.includes('youtube.com/shorts/')) id = url.split('shorts/')[1]?.split('?')[0]?.split('&')[0];
    else if (url.includes('youtube.com/embed/')) id = url.split('embed/')[1]?.split('?')[0]?.split('&')[0];

    // youtube-nocookie: YouTube's privacy-enhanced mode, which sets fewer cookies.
    if (id) return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&showinfo=0&rel=0&modestbranding=1`;
    if (url.includes('vimeo.com/')) {
        const vid = url.split('/').pop()?.split('?')[0];
        return `https://player.vimeo.com/video/${vid}?autoplay=1&muted=1&background=1&loop=1&byline=0&title=0`;
    }
    if (url.includes('instagram.com/')) {
        const base = url.split('?')[0];
        return `${base}${base.endsWith('/') ? '' : '/'}embed/`;
    }
    return url;
};

// The post's cover (with the framing set in the editor), or its video when `video` is on.
// A YouTube, Vimeo or Instagram video plays only with the visitor's OK for embedded videos
// (src/lib/consent.js); otherwise the cover shows.
export function PostMedia({ post, video = false, eager = false, className = '' }) {
    const consent = useConsent();
    if (video && post.videoUrl && (isRawVideo(post.videoUrl) || consent?.media)) {
        return isRawVideo(post.videoUrl) ? (
            <video src={post.videoUrl} poster={post.coverImage || undefined} autoPlay muted loop playsInline className={cn('w-full h-full object-cover', className)} />
        ) : (
            <div className={cn('w-full h-full relative overflow-hidden pointer-events-none', className)}>
                <iframe
                    src={getVideoEmbedUrl(post.videoUrl)}
                    className="absolute top-1/2 left-1/2 w-[130%] h-[130%] -translate-x-1/2 -translate-y-1/2 border-none"
                    allow="autoplay; encrypted-media"
                    title={post.title}
                    tabIndex={-1}
                />
            </div>
        );
    }
    if (!post.coverImage) return <div className={cn('w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-zinc-800 dark:to-zinc-900', className)} />;
    return (
        <img
            src={post.coverImage}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className={cn('w-full h-full object-cover', className)}
            style={{
                transform: `scale(${post.coverImageScale || 1})`,
                transformOrigin: `${post.coverImagePosX ?? 50}% ${post.coverImagePosY ?? 50}%`,
            }}
        />
    );
}

// Small uppercase label used across ConcertZone (category, section names).
export const Label = ({ children, className = '' }) => (
    <p className={cn('text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-zinc-500', className)}>{children}</p>
);

export function Meta({ post, className = '' }) {
    const bits = [
        post.author || 'Newbi Editorial',
        formatDate(post.publishDate),
        `${post.readingTime || 5} min read`,
    ].filter(Boolean);
    return (
        <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-gray-500 dark:text-zinc-400', className)}>
            {bits.map((b, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span aria-hidden="true" className="opacity-40">·</span>}
                    <span>{b}</span>
                </React.Fragment>
            ))}
        </p>
    );
}

export const CategoryChip = ({ children, className = '' }) => (
    <span className={cn('inline-flex items-center h-7 px-3 rounded-full bg-[var(--cz-accent)] text-black text-[11px] font-bold uppercase tracking-[0.14em]', className)}>
        {children}
    </span>
);

// The grid card for a story.
export function StoryCard({ post }) {
    return (
        <Link to={postPath(post)} className="group flex flex-col h-full rounded-[1.5rem] overflow-hidden bg-white dark:bg-white/[0.04] ring-1 ring-black/[0.06] dark:ring-white/10 hover:ring-black/15 dark:hover:ring-white/25 transition">
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-200 dark:bg-zinc-900">
                <PostMedia post={post} className="transition-transform duration-700 group-hover:scale-[1.04]" />
                {post.category && <CategoryChip className="absolute top-3 left-3">{post.category}</CategoryChip>}
            </div>
            <div className="flex flex-col flex-1 p-5">
                <h3 className="font-heading text-xl font-extrabold leading-tight tracking-[-0.02em] text-gray-950 dark:text-white line-clamp-2 underline-offset-4 decoration-2 decoration-[var(--cz-accent)] group-hover:underline">
                    {post.title}
                </h3>
                {post.shortDescription && <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-400 line-clamp-2">{post.shortDescription}</p>}
                <Meta post={post} className="mt-auto pt-4" />
            </div>
        </Link>
    );
}

export function Wordmark({ className = '' }) {
    return (
        <span className={cn('font-heading font-extrabold tracking-[-0.04em] text-gray-950 dark:text-white', className)}>
            Concert<span className="text-gray-500 dark:text-zinc-400">Zone</span><span className="text-[var(--cz-accent)] [-webkit-text-stroke:1px_rgba(0,0,0,0.35)] dark:[-webkit-text-stroke:0]">.</span>
        </span>
    );
}

function ThemeButton() {
    const { toggleTheme } = useTheme();
    return (
        <button
            type="button"
            onClick={() => toggleTheme()}
            aria-label="Switch light or dark theme"
            className="w-11 h-11 rounded-full flex items-center justify-center text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
            <Moon size={18} className="dark:hidden" aria-hidden="true" />
            <Sun size={18} className="hidden dark:block text-amber-300" aria-hidden="true" />
        </button>
    );
}

const navItem = ({ isActive }) => cn(
    'h-10 px-3.5 inline-flex items-center rounded-full text-sm font-semibold transition-colors',
    isActive ? 'bg-gray-950 text-white dark:bg-white dark:text-black' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white'
);

// `progressBar` sits along the header's bottom edge (the article page's reading bar).
export function CzHeader({ progressBar = null }) {
    return (
        <header className="sticky top-0 z-50 bg-[#F4F2EC]/85 dark:bg-[#050505]/85 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className="max-w-[1400px] mx-auto h-16 px-4 sm:px-6 lg:px-10 flex items-center gap-4">
                <Link to="/concertzone" aria-label="ConcertZone home" className="shrink-0 min-h-[44px] inline-flex items-center">
                    <Wordmark className="text-[1.45rem]" />
                </Link>
                <nav aria-label="Sections" className="hidden md:flex items-center gap-1 mx-auto">
                    {CATEGORIES.map((c) => (
                        <NavLink key={c.id} to={c.id === 'all' ? '/concertzone' : `/concertzone/${c.id}`} end className={navItem}>
                            {c.id === 'all' ? 'Latest' : c.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="ml-auto md:ml-0 flex items-center gap-1">
                    <ThemeButton />
                    <a href="/" className="h-10 px-3.5 inline-flex items-center gap-1 rounded-full ring-1 ring-black/10 dark:ring-white/15 text-sm font-semibold text-gray-800 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                        newbi.live <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                </div>
            </div>
            {progressBar}
        </header>
    );
}

const footLink = 'inline-flex items-center gap-2 min-h-[44px] text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white transition-colors';
const footHead = 'text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-zinc-500 mb-1';

export function CzFooter() {
    return (
        <footer className="border-t border-black/[0.08] dark:border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-12 grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
                <div className="space-y-3">
                    <Wordmark className="text-3xl" />
                    <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
                        Music, nightlife and culture from India: live events, artists, guides and the buzz.
                    </p>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                        A publication by <a href="/" className="font-semibold text-gray-950 dark:text-white underline underline-offset-4 decoration-[var(--cz-accent)] decoration-2">Newbi</a>.
                    </p>
                </div>
                <nav aria-label="Sections" className="flex flex-col">
                    <p className={footHead}>Read</p>
                    {CATEGORIES.map((c) => (
                        <Link key={c.id} to={c.id === 'all' ? '/concertzone' : `/concertzone/${c.id}`} className={footLink}>
                            {c.id === 'all' ? 'Latest stories' : c.label}
                        </Link>
                    ))}
                </nav>
                <div className="flex flex-col">
                    <p className={footHead}>Write to us</p>
                    <a href={`mailto:${EDITORIAL_EMAIL}`} className={footLink}><Mail size={16} aria-hidden="true" /> Pitch a story</a>
                    <a href="https://www.instagram.com/newbi.live" target="_blank" rel="noopener noreferrer" className={footLink}><Instagram size={16} aria-hidden="true" /> Instagram</a>
                    <a href="/contact" className={footLink}>Contact Newbi</a>
                </div>
            </div>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-zinc-500">
                <span>© {new Date().getFullYear()} Newbi Entertainment &amp; Marketing LLP</span>
                <a href="/terms" className="min-h-[44px] inline-flex items-center hover:text-gray-950 dark:hover:text-white">Terms</a>
                <a href="/privacy" className="min-h-[44px] inline-flex items-center hover:text-gray-950 dark:hover:text-white">Privacy</a>
            </div>
        </footer>
    );
}

// The page frame: ConcertZone's own colours, accent, header and footer.
export function CzShell({ header, children }) {
    const accent = useStore((s) => s.siteSettings?.concertzone?.accentColor) || DEFAULT_ACCENT;
    return (
        <div
            className="min-h-dvh flex flex-col bg-[#F4F2EC] dark:bg-[#050505] text-gray-950 dark:text-white selection:bg-[var(--cz-accent)] selection:text-black"
            style={{ '--cz-accent': accent }}
        >
            <a href="#cz-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-3 focus:rounded-xl focus:bg-white focus:text-black">Skip to content</a>
            {header || <CzHeader />}
            <main id="cz-main" className="flex-1">{children}</main>
            <CzFooter />
        </div>
    );
}
