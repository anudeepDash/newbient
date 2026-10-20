import React from 'react';
import { Link } from 'react-router-dom';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn } from '../../lib/utils';
import BrandLayers, { BRAND_GLASS } from '../../components/app/BrandLayers';
import { useT } from '../../i18n';

/* Layout pieces shared by the app pages. */

/* Section title with an optional "See all" link. */
export const SectionHeader = ({ title, to, linkLabel = 'See all' }) => {
    const t = useT();
    return (
    <div className="flex items-end justify-between gap-3">
        <h2 className="font-heading text-[22px] font-extrabold tracking-[-0.03em] lg:text-[28px]">{title}</h2>
        {to && (
            <Link to={to} className="-mr-1 flex h-9 items-center gap-0.5 rounded-full px-2 text-[14px] font-semibold text-gray-800 underline decoration-neon-green decoration-2 underline-offset-4 dark:text-zinc-200">
                {t(linkLabel)} <ChevronRight size={16} />
            </Link>
        )}
    </div>
    );
};

/* Phones: a swipeable row of cards. Larger screens: a grid. */
export const Rail = ({ children, className }) => (
    <div className={cn(
        '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 lg:gap-6',
        className
    )}>
        {React.Children.map(children, child => child && (
            <div className="w-[84%] max-w-[360px] shrink-0 snap-start sm:w-auto sm:max-w-none">{child}</div>
        ))}
    </div>
);

export const CardGrid = ({ children, className }) => (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6', className)}>{children}</div>
);

export const CardSkeleton = () => (
    <div className="overflow-hidden rounded-3xl border border-black/[0.05] bg-white dark:border-white/[0.06] dark:bg-[#0c0e14]">
        <div className="aspect-video animate-pulse bg-black/[0.05] dark:bg-white/[0.05]" />
        <div className="space-y-3 p-5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
            <div className="h-5 w-3/4 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
            <div className="h-10 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
        </div>
    </div>
);

export const EmptyState = ({ icon: Icon, title, message, action }) => (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
        {Icon && (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.04] text-gray-500 dark:bg-white/[0.05] dark:text-zinc-400">
                <Icon size={22} />
            </span>
        )}
        <p className="text-[16px] font-bold">{title}</p>
        {message && <p className="max-w-sm text-[14px] text-gray-500 dark:text-zinc-400">{message}</p>}
        {action}
    </div>
);

/* A big branded panel: the Newbi surface (BrandLayers) in liquid glass. */

/* Liquid-glass surface for app panels (same look as HeroPanel and the landing path cards). */
export const GLASS = 'relative overflow-hidden backdrop-blur-2xl backdrop-saturate-[1.8] bg-white/55 ring-1 ring-inset ring-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_44px_-26px_rgba(0,0,0,0.3)] dark:bg-white/[0.05] dark:ring-white/[0.12] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_44px_-26px_rgba(0,0,0,0.8)]';

export const HeroPanel = ({ eyebrow, title, children, className }) => (
    <section className={cn('rounded-[2rem] p-6 sm:p-8 lg:p-10', BRAND_GLASS, className)}>
        <BrandLayers />
        <div className="relative max-w-xl space-y-3 lg:space-y-4">
            {eyebrow && (
                <p className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.9)]" aria-hidden="true" />{eyebrow}
                </p>
            )}
            <h2 className="font-heading text-[26px] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-[32px] lg:text-[36px]">{title}</h2>
            {children}
        </div>
    </section>
);
