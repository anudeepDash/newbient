import React from 'react';
import { Link } from 'react-router-dom';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn } from '../../lib/utils';
import { AmbientBackdrop } from '../../components/app';

/* Layout pieces shared by the app pages. */

/* Section title with an optional "See all" link. */
export const SectionHeader = ({ title, to, linkLabel = 'See all' }) => (
    <div className="flex items-end justify-between gap-3">
        <h2 className="font-heading text-[20px] font-black tracking-tight">{title}</h2>
        {to && (
            <Link to={to} className="-mr-1 flex h-9 items-center gap-0.5 rounded-full px-2 text-[14px] font-bold text-emerald-700 dark:text-neon-green">
                {linkLabel} <ChevronRight size={16} />
            </Link>
        )}
    </div>
);

/* Phones: a swipeable row of cards. Larger screens: a grid. */
export const Rail = ({ children, className }) => (
    <div className={cn(
        '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3',
        className
    )}>
        {React.Children.map(children, child => child && (
            <div className="w-[84%] max-w-[360px] shrink-0 snap-start sm:w-auto sm:max-w-none">{child}</div>
        ))}
    </div>
);

export const CardGrid = ({ children, className }) => (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>{children}</div>
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

/* A big panel with the ambient glow of an image behind it. */
export const HeroPanel = ({ image, eyebrow, title, children, className }) => (
    <section className={cn('relative isolate overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white p-6 sm:p-8 dark:border-white/[0.08] dark:bg-[#0b0d12]', className)}>
        <AmbientBackdrop image={image} intensity={image ? 0.5 : 0.55} />
        <div className="relative max-w-xl space-y-3">
            {eyebrow && <p className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-neon-green">{eyebrow}</p>}
            <h2 className="font-heading text-[26px] font-black leading-[1.1] tracking-tight sm:text-[32px]">{title}</h2>
            {children}
        </div>
    </section>
);
