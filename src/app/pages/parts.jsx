import React from 'react';
import { Link } from 'react-router-dom';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn } from '../../lib/utils';
import newbiIcon from '../../assets/logo/newbi-icon.svg';

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
        'sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0',
        className
    )}>
        {React.Children.map(children, child => child && (
            <div className="w-[84%] max-w-[360px] shrink-0 snap-start sm:w-auto sm:max-w-none">{child}</div>
        ))}
    </div>
);

export const CardGrid = ({ children, className }) => (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
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

/*
 * A big branded panel: a dark base with a neon-green glow, a faint dot grid
 * and a large faded "N." mark. All gradients, so there's no live blur and it
 * stays light on iPhone Safari. Light mode gets the same composition in white.
 */
const DOTS = 'radial-gradient(currentColor 1px, transparent 1.2px)';
const FADE_RIGHT = 'linear-gradient(to left, black 0%, black 35%, transparent 85%)';

export const HeroPanel = ({ eyebrow, title, children, className }) => (
    <section className={cn(
        'relative isolate overflow-hidden rounded-[2rem] border p-6 sm:p-8',
        'border-emerald-900/10 bg-white text-gray-900 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.45)]',
        'dark:border-white/[0.08] dark:bg-[#06080a] dark:text-white dark:shadow-[0_20px_60px_-30px_rgba(57,255,20,0.35)]',
        className
    )}>
        {/* Glow: neon in dark mode, a soft mint wash in light mode */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 dark:hidden"
            style={{ background: 'radial-gradient(110% 90% at 100% 0%, rgba(57,255,20,0.30) 0%, rgba(16,185,129,0.12) 38%, transparent 65%), radial-gradient(80% 70% at 0% 100%, rgba(16,185,129,0.10), transparent 60%)' }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden dark:block"
            style={{ background: 'radial-gradient(110% 90% at 100% 0%, rgba(57,255,20,0.32) 0%, rgba(57,255,20,0.08) 38%, transparent 65%), radial-gradient(80% 70% at 0% 100%, rgba(16,185,129,0.16), transparent 60%)' }} />
        {/* Dot grid, fading out towards the text */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 text-emerald-900/[0.12] dark:text-white/[0.07]"
            style={{ backgroundImage: DOTS, backgroundSize: '16px 16px', WebkitMaskImage: FADE_RIGHT, maskImage: FADE_RIGHT }} />
        {/* The brand mark, large and faded, off the bottom-right corner */}
        <img aria-hidden="true" src={newbiIcon} alt="" className="pointer-events-none absolute -bottom-10 -right-8 -z-10 w-52 rotate-[-8deg] opacity-[0.10] sm:w-72 dark:opacity-[0.12]" />
        <div className="relative max-w-xl space-y-3">
            {eyebrow && <p className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-neon-green">{eyebrow}</p>}
            <h2 className="font-heading text-[26px] font-black leading-[1.1] tracking-tight sm:text-[32px]">{title}</h2>
            {children}
        </div>
    </section>
);
