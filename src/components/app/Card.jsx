import React from 'react';
import { Link } from 'react-router-dom';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Gift from 'lucide-react/dist/esm/icons/gift';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';
import { Stat, StatRow } from './Field';

/*
 * The one card for the app, generalised from the creator CampaignCard so every
 * card keeps its look: an aspect-video hero that fades into the body, the
 * blurred thumbnail aura and colour spill (desktop only, too heavy for iPhone
 * Safari), glass chips over the image, stat tiles and the CTA pill.
 *
 *   <Card
 *     type="guestlist"
 *     image={poster} title="Varun Jain Live" eyebrow="Newbi Presents"
 *     chips={[{ icon: MapPin, label: city }]}
 *     meta={[{ icon: Users, label: '12 spots left', tone: 'warn' }]}
 *     stats={[{ label: 'Date', value: 'Sat 26 Sep' }, { label: 'Entry', value: 'Free', tone: 'accent' }]}
 *     to="/community/g/abc"
 *   />
 *
 * Every slot drops empty values (lib/present.js), so a sparse document never
 * shows "—", "0+" or "Universal". Slots: `badges` (top right), `chips` (top
 * left), `meta` (pills above the title), `stats`, `progress`, `cta`, and
 * `children` (extra body content above the stats).
 */

export const CARD_TYPES = {
    campaign: { icon: Instagram, label: 'Campaign', cta: 'View opportunity' },
    event: { icon: CalendarDays, label: 'Event', cta: 'View event' },
    guestlist: { icon: Ticket, label: 'Guestlist', cta: 'Get on the list' },
    gig: { icon: Briefcase, label: 'Gig', cta: 'View gig' },
    giveaway: { icon: Gift, label: 'Giveaway', cta: 'Enter giveaway' },
    form: { icon: ClipboardList, label: 'Form', cta: 'Open form' },
};

const TONES = {
    default: 'bg-black/[0.02] text-gray-600 border-black/[0.06] dark:bg-white/[0.04] dark:text-zinc-400 dark:border-white/[0.07]',
    accent: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-neon-green/10 dark:text-neon-green dark:border-neon-green/20',
    warn: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
};

const GLASS_TONES = {
    default: 'bg-black/60 text-white border-white/15',
    accent: 'bg-neon-green/20 text-neon-green border-neon-green/30',
    warn: 'bg-amber-500/25 text-amber-200 border-amber-500/30',
    danger: 'bg-red-500/25 text-red-200 border-red-500/30',
};

const stripHtml = (html) => String(html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>|<[^>]+>/gi, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ').trim();

/* A glass chip over the hero image. Renders nothing without a label. */
export const GlassChip = ({ icon: Icon, label, tone = 'default', className }) => {
    if (!isPresent(label) && !Icon) return null;
    const iconOnly = !isPresent(label);
    return (
        <span className={cn(
            'flex items-center gap-1.5 rounded-xl border font-mono text-[9px] font-black uppercase tracking-widest shadow-lg transform-gpu sm:backdrop-blur-sm',
            iconOnly ? 'p-1.5' : 'px-2.5 py-1',
            GLASS_TONES[tone] || GLASS_TONES.default,
            className
        )}>
            {Icon && <Icon size={iconOnly ? 13 : 9} className={iconOnly || tone === 'default' ? 'text-neon-green' : undefined} />}
            {!iconOnly && <span className="truncate">{label}</span>}
        </span>
    );
};

/* A pill in the card body (followers, spots left, date). */
export const MetaPill = ({ icon: Icon, label, tone = 'default', className }) => {
    if (!isPresent(label)) return null;
    return (
        <span className={cn('flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-widest', TONES[tone] || TONES.default, className)}>
            {Icon && <Icon size={10} className={tone === 'default' ? 'text-emerald-600 dark:text-neon-green' : undefined} />}
            {label}
        </span>
    );
};

const Card = ({
    type = 'event',
    image,
    imageAlt,
    title,
    eyebrow,
    eyebrowLogo,
    description,
    chips = [],
    badges,
    meta = [],
    stats = [],
    progress = null,
    cta,
    children,
    to,
    /* Router state for `to` links (e.g. { backgroundLocation } to open a page as a sheet over this list). */
    linkState,
    href,
    onClick,
    className,
}) => {
    const kind = CARD_TYPES[type] || CARD_TYPES.event;
    const text = stripHtml(description);
    const shownChips = [{ icon: kind.icon }, ...(chips || []).filter(c => c && isPresent(c.label))];
    const shownMeta = (meta || []).filter(m => m && isPresent(m.label));
    const shownStats = (stats || []).filter(s => s && isPresent(s.value, { allowZero: s.allowZero }));
    const hasProgress = typeof progress === 'number' && Number.isFinite(progress);
    const ctaConfig = cta === false ? null : { label: kind.cta, icon: ArrowRight, ...(cta && typeof cta === 'object' && !React.isValidElement(cta) ? cta : {}) };
    const ctaNode = React.isValidElement(cta) ? cta : null;

    const Root = to ? Link : href ? 'a' : onClick ? 'button' : 'div';
    const rootProps = to ? { to, state: linkState } : href ? { href } : onClick ? { type: 'button', onClick } : {};

    return (
        <Root
            {...rootProps}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            className={cn(
                'group relative flex h-full w-full select-none flex-col overflow-hidden rounded-3xl border text-left transition-all duration-500 active:scale-[0.985]',
                'border-gray-200 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:border-neon-green/40 hover:shadow-[0_16px_60px_rgba(0,0,0,0.12)]',
                'dark:border-white/[0.07] dark:bg-[#0c0e14] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] dark:hover:border-white/[0.15] dark:hover:shadow-[0_16px_60px_rgba(0,0,0,0.8)]',
                (to || href || onClick) && 'cursor-pointer',
                className
            )}
        >
            {/* Progress strip */}
            {hasProgress && (
                <div className="absolute left-0 top-0 z-30 h-[3px] w-full overflow-hidden bg-black/5 dark:bg-white/5">
                    <div
                        className="h-full bg-neon-green shadow-[0_0_12px_rgba(57,255,20,0.8)] transition-[width] duration-700 ease-out"
                        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                    />
                </div>
            )}

            {/* Hero with the mask fade */}
            <div className="relative aspect-video w-full shrink-0 overflow-hidden transform-gpu">
                <div
                    className="pointer-events-none absolute inset-0 transform-gpu"
                    style={{
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, transparent 100%)',
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, transparent 100%)',
                    }}
                >
                    {image ? (
                        <>
                            {/* Neutral backing while the photo loads, so the vignette doesn't read as a white haze */}
                            <div className="absolute inset-0 bg-gray-200 dark:bg-zinc-900" />
                            {/* Aura: desktop only, iPhone Safari runs out of GPU memory with it */}
                            <div className="absolute -inset-8 hidden scale-110 bg-cover bg-center opacity-80 blur-xl transform-gpu sm:block" style={{ backgroundImage: `url("${image}")` }} />
                            <img
                                src={image}
                                alt={imageAlt || title || ''}
                                loading="lazy"
                                decoding="async"
                                className="relative z-10 h-full w-full object-cover transition-transform duration-700 sm:group-hover:scale-105"
                            />
                            <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.4)_100%)]" />
                        </>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-gray-100 via-gray-50 to-white dark:from-zinc-950 dark:via-[#121620] dark:to-[#0c0e14]">
                            {/* No poster: the card type's mark, so the hero isn't a blank box */}
                            <kind.icon size={56} strokeWidth={1.25} className="text-emerald-600/25 dark:text-neon-green/20" />
                        </div>
                    )}
                </div>

                {/* Glass chips, outside the mask so they stay opaque */}
                <div className="absolute left-3.5 top-3.5 z-20 flex max-w-[65%] items-center gap-2">
                    {shownChips.map((chip, i) => <GlassChip key={i} {...chip} />)}
                </div>
                {badges && <div className="absolute right-3.5 top-3.5 z-20 flex items-center gap-1.5">{badges}</div>}
            </div>

            {/* Body */}
            <div className="relative z-10 flex flex-1 flex-col px-5 pb-5 pt-4">
                {/* Colour spill from the image into the body (desktop only) */}
                {image && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 hidden h-32 bg-cover bg-center opacity-20 blur-2xl transform-gpu sm:block" style={{ backgroundImage: `url("${image}")` }} />
                )}

                {shownMeta.length > 0 && (
                    <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-2">
                        {shownMeta.map((m, i) => <MetaPill key={i} {...m} />)}
                    </div>
                )}

                <div className="relative z-10 mb-5 flex-1">
                    {(isPresent(eyebrow) || eyebrowLogo) && (
                        <div className="mb-1.5 flex items-center gap-1.5">
                            {eyebrowLogo && <img src={eyebrowLogo} alt="" className="h-4 w-4 shrink-0 rounded border border-black/10 bg-white object-contain p-0.5 dark:border-white/10 dark:bg-zinc-800" />}
                            {isPresent(eyebrow) && <span className="truncate text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-neon-green">{eyebrow}</span>}
                        </div>
                    )}
                    {isPresent(title) && (
                        <h3 className="mb-2 font-heading text-lg font-black leading-snug tracking-tight text-gray-900 transition-colors duration-300 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-neon-green">
                            {title}
                        </h3>
                    )}
                    {isPresent(text) && <p className="line-clamp-2 text-[12px] font-medium leading-relaxed text-gray-600 dark:text-zinc-500">{text}</p>}
                    {children}
                </div>

                {shownStats.length > 0 && (
                    <StatRow className="relative z-10 mb-5">
                        {shownStats.map((s, i) => <Stat key={s.label || i} {...s} />)}
                    </StatRow>
                )}

                {ctaNode || (ctaConfig && (
                    <div className="relative z-10 flex items-center justify-between rounded-2xl border border-black/[0.05] bg-black/[0.02] px-4 py-2.5 transition-all duration-300 group-hover:border-emerald-200 group-hover:bg-emerald-50 dark:border-white/[0.07] dark:bg-white/[0.03] dark:group-hover:border-neon-green dark:group-hover:bg-neon-green">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 transition-colors duration-300 group-hover:text-emerald-700 dark:text-zinc-400 dark:group-hover:text-black">
                            {ctaConfig.label}
                        </span>
                        {ctaConfig.icon && <ctaConfig.icon size={13} className="text-gray-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-emerald-700 dark:text-zinc-500 dark:group-hover:text-black" />}
                    </div>
                ))}
            </div>
        </Root>
    );
};

export default Card;
