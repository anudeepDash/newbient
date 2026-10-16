import Sticker from '../components/Sticker';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Building2, Megaphone, Ticket, Music2 } from 'lucide-react';
import { APP_LINKS } from '../links';
import newbiIcon from '../../assets/logo/newbi-icon.svg';

/*
 * The three ways into Newbi. Brands and colleges go to the enquiry form;
 * creators and the community go straight into the app.
 */
const PATHS = [
    {
        key: 'brand',
        title: 'Plan a campaign or fest',
        text: 'Activations, artist shows and creator campaigns, run end to end.',
        cta: 'Work with us',
        to: '/#enquire',
    },
    {
        key: 'creator',
        title: 'Join as a creator',
        text: 'Paid and barter campaigns, concert access and tickets for the shows you post about.',
        cta: 'Apply in 2 minutes',
        href: APP_LINKS.creatorApply,
        more: { label: 'How it works', to: '/creator' },
        featured: true,
    },
    {
        key: 'community',
        title: 'Join the community',
        text: 'Guestlists, volunteer gigs and giveaways for shows near you. Free.',
        cta: 'Join free',
        href: APP_LINKS.community,
        more: { label: 'What you get', to: '/community' },
    },
];

/*
 * A "liquid glass" card: a frosted, saturated pane with a bright top edge, a
 * diagonal sheen and a soft drop shadow. The whole card is one link (the
 * stretched CTA); the secondary link sits above it. The creator card is
 * tinted green glass with a solid pill. One backdrop blur per card.
 */
function PathCard({ path, onChooseAudience }) {
    const featured = path.featured;
    const pill = featured
        ? 'bg-neon-green text-black shadow-[0_8px_24px_-8px_rgba(57,255,20,0.9),inset_0_1px_0_rgba(255,255,255,0.6)]'
        : 'bg-white/70 text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_14px_-6px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.12] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] dark:ring-white/10';
    const ctaCls = `relative inline-flex h-10 items-center gap-1.5 rounded-full px-5 font-heading text-[15px] font-bold transition-transform group-hover:scale-[1.03] after:absolute after:inset-[-999px] after:content-[''] ${pill}`;
    const cta = (
        <>{path.cta} <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></>
    );

    return (
        <div className={`group relative isolate flex h-full flex-col overflow-hidden rounded-[26px] p-5 backdrop-blur-2xl backdrop-saturate-[1.8] transition-transform duration-300 hover:-translate-y-1 sm:px-6 sm:py-5 ${featured
            ? 'bg-[rgba(57,255,20,0.16)] ring-1 ring-inset ring-[rgba(57,255,20,0.55)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_24px_60px_-24px_rgba(57,255,20,0.55)] dark:bg-[rgba(57,255,20,0.11)]'
            : 'bg-white/45 ring-1 ring-inset ring-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_60px_-28px_rgba(0,0,0,0.35)] dark:bg-white/[0.05] dark:ring-white/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_60px_-28px_rgba(0,0,0,0.8)]'}`}>
            {/* Sheen: light catching the top-left of the glass */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-white/60 via-white/[0.08] to-transparent opacity-80 dark:from-white/[0.16] dark:via-white/[0.03]" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90 dark:via-white/60" />

            <h3 className="font-heading text-[22px] font-extrabold leading-[1.1] tracking-[-0.03em] text-gray-950 dark:text-white">{path.title}</h3>
            <p className="mt-1.5 text-[14px] leading-snug text-gray-700 dark:text-zinc-300">{path.text}</p>

            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4">
                {path.href
                    ? <a href={path.href} className={ctaCls}>{cta}</a>
                    : <Link to={path.to} onClick={() => onChooseAudience?.(path.key)} className={ctaCls}>{cta}</Link>}
                {path.more && (
                    <Link to={path.more.to} className="relative z-10 inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold text-gray-700 underline decoration-neon-green underline-offset-4 dark:text-zinc-300">
                        {path.more.label} <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                )}
            </div>
        </div>
    );
}

/*
 * Right-hand visual: the brand mark as a big sticker, with tags for what we do
 * floating around it. No photos, so it always looks finished, whatever's in
 * the feed. The tags drift gently (CSS, off for reduced motion).
 */
const TAGS = [
    { label: 'Campus activations', icon: Building2, pos: 'left-[2%] top-[10%]', tilt: '-rotate-[6deg]', delay: '0s' },
    { label: 'Creator campaigns', icon: Megaphone, pos: 'right-[0%] top-[24%]', tilt: 'rotate-[5deg]', delay: '-2s', accent: true },
    { label: 'Artist shows', icon: Music2, pos: 'left-[0%] bottom-[26%]', tilt: 'rotate-[4deg]', delay: '-4s' },
    { label: 'Guestlists & passes', icon: Ticket, pos: 'right-[4%] bottom-[8%]', tilt: '-rotate-[4deg]', delay: '-1s' },
];

function BrandArt() {
    return (
        <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[460px]">
            <div className="absolute inset-[12%] rounded-full bg-neon-green/25 blur-3xl dark:bg-neon-green/15" />
            <div className="absolute inset-[14%] rounded-[3rem] border border-gray-950/10 dark:border-white/10" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '18px 18px', color: 'rgba(0,0,0,0.12)' }} />
            <img src={newbiIcon} alt="" width="579" height="476" className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] drop-shadow-[0_24px_40px_rgba(0,0,0,0.25)]" />
            {TAGS.map((t) => (
                <span key={t.label} className={`nb-float absolute ${t.pos}`} style={{ animationDelay: t.delay }}>
                    <span className={`inline-flex items-center gap-2 rounded-full border-[3px] px-4 py-2.5 font-heading text-[14px] font-extrabold shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] sm:text-[15px] ${t.tilt} ${t.accent
                        ? 'border-black bg-neon-green text-black'
                        : 'border-black bg-white text-gray-950 dark:border-white/80 dark:bg-[#111] dark:text-white'}`}>
                        <t.icon size={16} aria-hidden="true" /> {t.label}
                    </span>
                </span>
            ))}
        </div>
    );
}

/*
 * Home hero. Left: the headline, what we do and the two actions. Right: the
 * brand mark with what we do around it. Below: the three ways
 * in, so creators and fans see their path without scrolling. The headline
 * lines still slide apart as you scroll away (CSS, off for reduced motion).
 */
export default function Hero({ onChooseAudience }) {
    return (
        <section className="relative overflow-hidden">
            {/* A soft colour wash instead of the grid: neon from the top right, a cool tint bottom left. */}
            <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'radial-gradient(55% 55% at 88% 8%, rgba(57,255,20,0.32), transparent 70%), radial-gradient(45% 50% at 0% 85%, rgba(56,189,248,0.16), transparent 70%), radial-gradient(40% 40% at 45% 40%, rgba(255,255,255,0.7), transparent 70%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'radial-gradient(55% 55% at 88% 8%, rgba(57,255,20,0.20), transparent 70%), radial-gradient(45% 50% at 0% 85%, rgba(56,189,248,0.10), transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.035] text-black dark:text-white" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(to bottom, #000 30%, transparent 80%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 30%, transparent 80%)' }} />
            </div>

            <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-12 pt-10 sm:px-6 md:pt-16 lg:px-10 lg:pb-16">
                {/* Phones: headline, then the ways in, then the brand art. Desktop: headline | brand art, ways in below. */}
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-10 lg:gap-y-16">
                    <div className="order-1">
                        <h1 className="font-heading font-extrabold leading-[0.92] tracking-[-0.045em] text-gray-950 dark:text-white text-[15vw] sm:text-[11vw] lg:text-[6.6vw] 2xl:text-[7.6rem]">
                            <span className="nb-exit-l block">We make</span>{' '}
                            <span className="nb-exit-r block">young India</span>{' '}
                            <span className="nb-exit-l block"><Sticker tilt="-rotate-[2deg]">show up.</Sticker></span>
                        </h1>
                        <p className="nb-exit-fade mt-6 max-w-md text-lg leading-snug text-gray-700 dark:text-zinc-300 md:text-xl">
                            Campus activations, live shows and creator campaigns across India.
                        </p>
                        <div className="nb-exit-fade mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link to="/#enquire" onClick={() => onChooseAudience?.('brand')} className="group inline-flex h-14 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-neon-green px-8 font-heading text-base font-extrabold text-black shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:translate-y-0 active:shadow-[2px_2px_0_#000]">
                                Work with us <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </Link>
                            <Link to="/work" className="inline-flex h-14 items-center justify-center rounded-full bg-white/60 px-8 font-heading text-base font-bold text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-12px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-black/[0.08] backdrop-blur-xl transition hover:bg-white/80 dark:bg-white/[0.08] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:ring-white/15 dark:hover:bg-white/[0.14]">
                                See the work
                            </Link>
                        </div>
                    </div>

                    <div className="order-3 lg:order-2">
                        <BrandArt />
                    </div>

                    <nav aria-label="Choose your way in" className="relative order-2 grid gap-3 md:grid-cols-3 md:gap-4 lg:order-3 lg:col-span-2">
                        {/* Colour behind the glass: soft washes (gradients, no filter) for the panes to frost */}
                        <span aria-hidden="true" className="pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10" style={{ background: 'radial-gradient(40% 70% at 50% 55%, rgba(57,255,20,0.30), transparent 70%), radial-gradient(30% 60% at 12% 40%, rgba(16,185,129,0.20), transparent 70%), radial-gradient(30% 60% at 88% 45%, rgba(56,189,248,0.18), transparent 70%)' }} />
                        {PATHS.map((p) => <PathCard key={p.key} path={p} onChooseAudience={onChooseAudience} />)}
                    </nav>
                </div>
            </div>
        </section>
    );
}
