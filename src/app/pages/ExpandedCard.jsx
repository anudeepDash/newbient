import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import { BrandLayers, BRAND_GLASS, Button, GlassChip, MetaPill, PosterGlow, Sheet } from '../../components/app';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';
import { PageBody } from './PageHeader';
import { EmptyState } from './parts';
import { useT } from '../../i18n';

/*
 * A card, expanded: the campaign popup's look, shared by everything a card
 * opens (campaigns, guestlists, giveaways, forms, gigs).
 *
 *   Over a list (overlay): a sheet, full height on phones, a dialog on
 *   desktop; the action bar is pinned to its bottom edge.
 *   From a shared link: the same card centred on the page, the action bar
 *   pinned to the card on desktop and docked to the screen on phones.
 *
 * Top to bottom: the 16:9 poster bleeding to the edges with its colours
 * glowing behind it and glass chips on it, then the title block, then the
 * sections. Anything empty isn't shown.
 */

/* The poster, edge to edge, fading into the card; the kind icon stands in when there's none.
   ambientColor: the admin's glow colour (lib/ambientColor.js). */
export const ExpandedHero = ({ image, ambientColor, icon: Icon, chips = [] }) => {
    const shown = chips.filter(c => c && (c.node || isPresent(c.label)));
    return (
        <div className="relative aspect-video w-full shrink-0">
            <PosterGlow image={image} color={ambientColor} height="200%" />
            <div className="absolute inset-0" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)' }}>
                {image ? (
                    <>
                        <img src={image} alt="" className="relative h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.35)_100%)]" />
                    </>
                ) : Icon ? (
                    <div className="flex h-full w-full items-center justify-center"><Icon size={64} strokeWidth={1.25} className="text-emerald-600/25 dark:text-neon-green/20" /></div>
                ) : null}
            </div>
            <div className="absolute left-4 top-4 z-10 flex max-w-[75%] flex-wrap items-center gap-2">
                {Icon && <GlassChip icon={Icon} />}
                {shown.map((c, i) => c.node ? <React.Fragment key={i}>{c.node}</React.Fragment> : <GlassChip key={c.label} icon={c.icon} label={c.label} tone={c.tone} />)}
            </div>
        </div>
    );
};

/* Meta pills, the brand line, the title, then whatever goes under it (a StatRow). */
export const ExpandedTitle = ({ meta = [], eyebrow, title, children }) => {
    const shownMeta = meta.filter(m => m && isPresent(m.label));
    return (
        <div className="space-y-3">
            {shownMeta.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {shownMeta.map(m => <MetaPill key={m.label} {...m} />)}
                </div>
            )}
            {eyebrow}
            <h1 className="font-heading text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[30px]">{title}</h1>
            {children}
        </div>
    );
};

/* The action bar: the main action (or a status line) with Share beside it. */
export const ActionBar = ({ children, onShare, shareLabel = 'Share' }) => {
    const t = useT();
    return (
        <div className="flex items-center gap-2">
            {children}
            {onShare && <Button variant="secondary" size="lg" icon={Share2} onClick={onShare} aria-label={t(shareLabel)} className="w-14 shrink-0 px-0" />}
        </div>
    );
};

/* A status line in the action bar ("You're on the list."), the same height as a button. */
export const BarStatus = ({ icon: Icon, tone = 'default', children }) => (
    <p className={cn(
        'flex min-h-[48px] flex-1 items-center gap-2 text-[14px]',
        tone === 'success' ? 'font-bold text-emerald-700 dark:text-neon-green' : 'font-semibold text-gray-700 dark:text-zinc-300'
    )}>
        {Icon && <Icon size={17} className={cn('shrink-0', tone === 'warn' && 'text-amber-600 dark:text-amber-300')} />}
        {children}
    </p>
);

const ExpandedCard = ({ overlay = false, onClose, label, hero, bar, children }) => {
    const content = <div className="relative space-y-6 px-5 pb-6 sm:px-7">{children}</div>;

    if (overlay) {
        return (
            <Sheet
                open
                onClose={onClose}
                size="full"
                width="lg"
                bleed
                header={<span className="sr-only">{label}</span>}
                footer={bar}
                bodyClassName="px-0 pb-0 pt-0 sm:px-0"
            >
                {hero}
                {content}
            </Sheet>
        );
    }

    return (
        <>
            <article className={cn('mx-auto max-w-2xl rounded-[2rem]', BRAND_GLASS)}>
                <BrandLayers soft mark={false} />
                {hero}
                {content}
                {bar && (
                    // Desktop: pinned to the card's bottom edge.
                    <div className="sticky bottom-0 z-20 hidden rounded-b-[2rem] border-t border-black/[0.06] bg-[#f7f7f3]/90 px-7 py-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0b0d12]/90 lg:block">
                        {bar}
                    </div>
                )}
                <div className="h-4 lg:hidden" aria-hidden="true" />
            </article>
            {bar && (
                // Phones: docked at the bottom edge (the tab pill steps aside on these pages).
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-[#f7f7f3]/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0b0d12]/90 lg:hidden">
                    <div className="mx-auto max-w-2xl">{bar}</div>
                </div>
            )}
        </>
    );
};

/* Loading and not-found states in the same frame, so the sheet doesn't jump. */
export const ExpandedSkeleton = () => (
    <div className="space-y-4">
        <div className="aspect-video animate-pulse rounded-3xl bg-black/[0.05] dark:bg-white/[0.05]" />
        <div className="h-8 w-3/4 animate-pulse rounded-xl bg-black/[0.05] dark:bg-white/[0.05]" />
        <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
    </div>
);

/*
 * A page that's a card, expanded: over the list it was opened from, or on its
 * own page (with a back link) when opened from a shared link. `body` is the
 * loading or not-found state, shown in the same frame.
 */
export const ExpandedPage = ({ overlay, onClose, back, label, body, ...card }) => {
    // Over a list, loading and loaded are the same sheet, so it slides up once
    // instead of being swapped for a new one when the data arrives.
    if (overlay) {
        return (
            <Sheet
                open
                onClose={onClose}
                size="full"
                width="lg"
                bleed
                header={<span className="sr-only">{label}</span>}
                footer={body ? null : card.bar}
                bodyClassName={body ? 'px-5 pb-6 pt-16 sm:px-7' : 'px-0 pb-0 pt-0 sm:px-0'}
            >
                {body || (
                    <>
                        {card.hero}
                        <div className="relative space-y-6 px-5 pb-6 sm:px-7">{card.children}</div>
                    </>
                )}
            </Sheet>
        );
    }
    if (body) {
        return (
            <PageBody>
                <div className="mx-auto max-w-2xl">
                    {back}
                    {body}
                </div>
            </PageBody>
        );
    }
    return (
        <PageBody>
            <div>
                {back && <div className="mx-auto max-w-2xl">{back}</div>}
                <ExpandedCard label={label} {...card} />
            </div>
        </PageBody>
    );
};

/* Not found (or gone), in the same frame. */
export const ExpandedMissing = ({ title, message, action }) => (
    <EmptyState icon={SearchX} title={title} message={message} action={action} />
);

/* Closing a card opened over a list goes back to that list; otherwise to `fallback`. */
export const useCloseExpanded = (fallback) => {
    const navigate = useNavigate();
    const location = useLocation();
    return () => {
        if (location.state?.backgroundLocation) navigate(-1);
        else navigate(fallback, { replace: true });
    };
};

/* "← Community" above a card opened from a shared link. */
export const BackButton = ({ to, children }) => (
    <Button variant="ghost" size="sm" icon={ArrowLeft} to={to} className="-ml-2 mb-3">{children}</Button>
);

export default ExpandedCard;
