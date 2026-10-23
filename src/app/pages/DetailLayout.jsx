import React from 'react';
import { Link } from 'react-router-dom';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';
import { PageBody } from './PageHeader';
import { GLASS } from './parts';
import { useT } from '../../i18n';

/*
 * The page for one thing (a guestlist, a giveaway, a form), laid out like the
 * campaign popup:
 *
 *   Phones   back · poster · title · facts · the action · sections
 *   Desktop  two columns: the poster stays put on the left; title, facts,
 *            the action and the sections on the right.
 *
 * With no poster it's one centred column. `aside` adds content under the
 * poster on desktop (and above the main column on phones).
 */

export const BackLink = ({ to, children }) => (
    <Link to={to} className="-ml-2 inline-flex h-10 items-center gap-1 rounded-full px-2 text-[14px] font-bold text-gray-600 transition-colors hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white">
        <ChevronLeft size={18} /> {children}
    </Link>
);

/* A glass panel for facts, actions and lists. */
export const Panel = ({ label, children, className }) => (
    <section className={cn('space-y-3 rounded-[1.75rem] p-5', GLASS, className)}>
        {label && <PanelLabel>{label}</PanelLabel>}
        {children}
    </section>
);

export const PanelLabel = ({ children }) => (
    <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-zinc-400">
        <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.9)]" aria-hidden="true" />
        {children}
    </p>
);

/* A row inside a list panel (task, leaderboard entry, link). */
export const ROW = 'rounded-2xl bg-white/60 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.04] dark:ring-white/[0.08]';

export const ShareButton = ({ onClick, label = 'Share' }) => {
    const t = useT();
    return (
    <button
        type="button"
        aria-label={t(label)}
        onClick={onClick}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/60 text-gray-700 ring-1 ring-inset ring-black/[0.08] transition-colors hover:bg-white dark:bg-white/[0.06] dark:text-zinc-300 dark:ring-white/[0.12] dark:hover:bg-white/[0.1]"
    >
        <Share2 size={17} />
    </button>
    );
};

export const DetailSkeleton = () => (
    <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
            <div className="aspect-video animate-pulse rounded-3xl bg-black/[0.05] dark:bg-white/[0.05] lg:aspect-[4/5]" />
            <div className="space-y-4">
                <div className="h-10 w-2/3 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
                <div className="h-40 animate-pulse rounded-[1.75rem] bg-black/[0.04] dark:bg-white/[0.04]" />
                <div className="h-24 animate-pulse rounded-[1.75rem] bg-black/[0.04] dark:bg-white/[0.04]" />
            </div>
        </div>
    </PageBody>
);

const DetailLayout = ({ back, image, badges, eyebrow, title, onShare, aside, children }) => {
    const hasImage = isPresent(image);
    return (
        <PageBody>
            <div className="relative isolate">
                {back && <div className="mb-3 lg:mb-5">{back}</div>}
                <div className={cn('grid grid-cols-1 gap-6', hasImage ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12' : 'mx-auto max-w-2xl')}>
                    {hasImage && (
                        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                            <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-black/[0.04] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)] dark:border-white/[0.08] dark:bg-white/[0.04]">
                                <img src={image} alt="" decoding="async" className="aspect-video w-full object-cover lg:aspect-auto lg:max-h-[calc(100dvh-9rem)] lg:object-contain" />
                                {badges && <div className="absolute left-3 top-3 flex flex-wrap gap-2">{badges}</div>}
                            </div>
                            {aside && <div className="hidden lg:block">{aside}</div>}
                        </div>
                    )}
                    <div className="min-w-0 space-y-6">
                        <header className="space-y-3">
                            {!hasImage && badges && <div className="flex flex-wrap gap-2">{badges}</div>}
                            {eyebrow && <PanelLabel>{eyebrow}</PanelLabel>}
                            <div className="flex items-start justify-between gap-3">
                                <h1 className="font-heading text-[30px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[36px] lg:text-[44px]">{title}</h1>
                                {onShare && <ShareButton onClick={onShare} />}
                            </div>
                        </header>
                        {aside && <div className={hasImage ? 'lg:hidden' : undefined}>{aside}</div>}
                        {children}
                    </div>
                </div>
            </div>
        </PageBody>
    );
};

export default DetailLayout;
