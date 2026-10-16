import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Building2, Sparkles, Ticket, Music2 } from 'lucide-react';
import { APP_LINKS } from '../links';
import newbiIcon from '../../assets/logo/newbi-icon.svg';

/*
 * The three ways into Newbi. Brands and colleges go to the enquiry form;
 * creators and the community go straight into the app.
 */
const PATHS = [
    {
        key: 'brand',
        icon: Building2,
        label: 'Brands & colleges',
        title: 'Plan a campaign or fest',
        text: 'Activations, artist shows and creator campaigns, run end to end.',
        cta: 'Work with us',
        to: '/#enquire',
    },
    {
        key: 'creator',
        icon: Sparkles,
        label: 'Creators',
        title: 'Join as a creator',
        text: 'Paid and barter campaigns, concert access and tickets for the shows you post about.',
        cta: 'Apply in 2 minutes',
        href: APP_LINKS.creatorApply,
        more: { label: 'How it works', to: '/creator' },
        featured: true,
    },
    {
        key: 'community',
        icon: Ticket,
        label: 'Fans & students',
        title: 'Join the community',
        text: 'Guestlists, volunteer gigs and giveaways for shows near you. Free.',
        cta: 'Join free',
        href: APP_LINKS.community,
        more: { label: 'What you get', to: '/community' },
    },
];

function PathCard({ path, onChooseAudience }) {
    const Icon = path.icon;
    const featured = path.featured;
    const body = (
        <>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${featured ? 'bg-black/10 text-black' : 'bg-emerald-600/10 text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green'}`}>
                <Icon size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className={`block font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${featured ? 'text-black/60' : 'text-gray-500 dark:text-zinc-500'}`}>{path.label}</span>
                <span className="mt-1 block font-heading text-xl font-extrabold tracking-[-0.02em] leading-tight">{path.title}</span>
                <span className={`mt-1.5 block text-[14px] leading-snug ${featured ? 'text-black/70' : 'text-gray-600 dark:text-zinc-400'}`}>{path.text}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 font-heading text-[15px] font-bold">
                    {path.cta} <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </span>
            </span>
        </>
    );
    const cls = `group relative flex flex-1 gap-4 rounded-3xl p-5 sm:p-6 text-left transition-[transform,background-color,border-color] hover:-translate-y-0.5 active:scale-[0.99] ${featured
        ? 'bg-neon-green text-black shadow-[0_20px_50px_-20px_rgba(57,255,20,0.7)]'
        : 'border border-gray-950/10 bg-white/70 text-gray-950 hover:border-gray-950/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/25'}`;

    return (
        <div className="flex flex-col">
            {path.href
                ? <a href={path.href} className={cls}>{body}</a>
                : <Link to={path.to} onClick={() => onChooseAudience?.(path.key)} className={cls}>{body}</Link>}
            {path.more ? (
                <Link to={path.more.to} className="mt-1 inline-flex min-h-[44px] items-center gap-1 self-start px-2 text-[13px] font-semibold text-gray-600 underline decoration-neon-green underline-offset-4 dark:text-zinc-400">
                    {path.more.label} <ArrowRight size={13} aria-hidden="true" />
                </Link>
            ) : <span aria-hidden="true" className="mt-1 hidden min-h-[44px] md:block" />}
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
    { label: 'Creator campaigns', icon: Sparkles, pos: 'right-[0%] top-[24%]', tilt: 'rotate-[5deg]', delay: '-2s', accent: true },
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
            <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 85% 15%, rgba(57,255,20,0.18), transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.06] text-black dark:text-white" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'linear-gradient(to bottom, #000 40%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, #000 40%, transparent)' }} />
            </div>

            <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-12 pt-10 sm:px-6 md:pt-16 lg:px-10 lg:pb-16">
                {/* Phones: headline, then the ways in, then the brand art. Desktop: headline | brand art, ways in below. */}
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-10 lg:gap-y-16">
                    <div className="order-1">
                        <h1 className="font-heading font-extrabold leading-[0.9] tracking-[-0.045em] text-gray-950 dark:text-white text-[16vw] sm:text-[12vw] lg:text-[7.4vw] 2xl:text-[8.2rem]">
                            <span className="nb-exit-l block">We make</span>{' '}
                            <span className="nb-exit-r nb-ghost block">young India</span>{' '}
                            <span className="nb-exit-l block text-emerald-600 dark:text-neon-green">show up.</span>
                        </h1>
                        <p className="nb-exit-fade mt-7 max-w-xl text-lg leading-snug text-gray-700 dark:text-zinc-300 md:text-2xl">
                            Event marketing, brand activations, creator campaigns and live shows across India. One crew, from the first idea to the last encore.
                        </p>
                        <div className="nb-exit-fade mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link to="/#enquire" onClick={() => onChooseAudience?.('brand')} className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gray-950 px-8 font-heading text-base font-bold text-white transition hover:scale-[1.03] active:scale-[0.98] dark:bg-white dark:text-black">
                                Work with us <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </Link>
                            <Link to="/work" className="inline-flex h-14 items-center justify-center rounded-full border border-gray-950/25 px-8 font-heading text-base font-bold text-gray-950 transition-colors hover:bg-gray-950 hover:text-white dark:border-white/25 dark:text-white dark:hover:bg-white dark:hover:text-black">
                                See the work
                            </Link>
                        </div>
                    </div>

                    <div className="order-3 lg:order-2">
                        <BrandArt />
                    </div>

                    <nav aria-label="Choose your way in" className="order-2 grid gap-3 md:grid-cols-3 md:gap-4 lg:order-3 lg:col-span-2">
                        {PATHS.map((p) => <PathCard key={p.key} path={p} onChooseAudience={onChooseAudience} />)}
                    </nav>
                </div>
            </div>
        </section>
    );
}
