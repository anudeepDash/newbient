import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { LogoImage } from '../components/Logo';
import { APP_LINKS } from '../links';

const AUDIENCES = [
    { key: 'brand', label: 'a brand', to: '/#enquire' },
    { key: 'college', label: 'a college', to: '/#enquire' },
    { key: 'creator', label: 'a creator', to: '/creator' },
    { key: 'community', label: 'here for the shows', to: '/community' },
];

const formatDay = (iso) => {
    const d = new Date(`${iso}T00:00:00+05:30`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
};

// "The Pulse of Youth" on a slowly turning ring: the old site's line, kept as the stamp.
function Badge() {
    return (
        <div className="relative w-28 h-28 md:w-36 md:h-36 text-gray-950 dark:text-white" aria-hidden="true">
            <svg viewBox="0 0 120 120" className="nb-spin absolute inset-0 w-full h-full">
                <defs><path id="nb-ring" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
                <text className="fill-current font-mono font-bold" fontSize="10.5" letterSpacing="2.4">
                    <textPath href="#nb-ring" textLength="286" lengthAdjust="spacing">THE PULSE OF YOUTH • NEWBI.LIVE • </textPath>
                </text>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-neon-green text-black flex items-center justify-center"><ArrowDownRight size={20} /></span>
            </span>
        </div>
    );
}

const pillCls = 'inline-flex items-center min-h-[44px] px-4 rounded-full border border-gray-950/20 dark:border-white/20 text-sm font-semibold text-gray-950 dark:text-white hover:bg-gray-950 hover:text-white dark:hover:bg-neon-green dark:hover:text-black hover:border-transparent transition-colors';

/*
 * Home hero: the logo, a headline set as large as the screen allows, the
 * spinning "Pulse of Youth" stamp, the two actions, and a row of pills that
 * send brands and colleges to the form, creators to /creator and everyone
 * here for the shows to the community. Everything is on the page at first
 * paint; the lines slide apart and dim as you scroll away (CSS, off for
 * reduced motion).
 */
export default function Hero({ onChooseAudience, nextEvent }) {
    return (
        <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
            <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 85% 10%, rgba(57,255,20,0.16), transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.06] text-black dark:text-white" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'linear-gradient(to bottom, #000 40%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, #000 40%, transparent)' }} />
            </div>

            <div className="relative flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-8 md:pt-12 pb-8">
                <div className="nb-exit-fade flex items-center justify-between gap-4">
                    <LogoImage height={40} className="md:!h-[52px]" priority />
                    <p className="hidden sm:flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">
                        <span className="relative flex w-2 h-2">
                            <span className="nb-ping absolute inset-0 rounded-full bg-neon-green/70" />
                            <span className="relative w-2 h-2 rounded-full bg-neon-green" />
                        </span>
                        Event marketing &amp; live entertainment · India
                    </p>
                </div>

                <div className="flex-1 flex flex-col justify-center py-10 md:py-14">
                    <h1 className="font-heading font-extrabold tracking-[-0.045em] leading-[0.9] text-gray-950 dark:text-white text-[15vw] sm:text-[12vw] lg:text-[10vw] xl:text-[9vw]">
                        <span className="nb-exit-l block">We make</span>{' '}
                        <span className="nb-exit-r nb-outline block">young India</span>{' '}
                        <span className="nb-exit-l block text-emerald-600 dark:text-neon-green">show up.</span>
                    </h1>

                    <div className="nb-exit-fade mt-8 md:mt-12 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="max-w-xl">
                            <p className="text-lg md:text-2xl leading-snug text-gray-700 dark:text-zinc-300">
                                Event marketing, brand activations, influencer campaigns and live production across India. One crew, from the first idea to the last encore.
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row gap-3">
                                <Link to="/#enquire" className="group h-14 px-8 inline-flex items-center justify-center gap-2 rounded-full bg-neon-green text-black font-heading font-bold text-base hover:scale-[1.03] active:scale-[0.98] transition">
                                    Work with us <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                                </Link>
                                <Link to="/#work" className="h-14 px-8 inline-flex items-center justify-center rounded-full border border-gray-950/25 dark:border-white/25 text-gray-950 dark:text-white font-heading font-bold text-base hover:bg-gray-950 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                                    See the work
                                </Link>
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-8">
                            {nextEvent && (
                                <a href={APP_LINKS.event(nextEvent.id)} className="group max-w-[220px]">
                                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-neon-green">Next up · {formatDay(nextEvent.date)}</span>
                                    <span className="mt-1 block font-heading text-lg font-bold text-gray-950 dark:text-white group-hover:underline">{nextEvent.title}</span>
                                    {nextEvent.city && <span className="mt-0.5 block text-sm text-gray-500 dark:text-zinc-500">{nextEvent.city}</span>}
                                </a>
                            )}
                            <Badge />
                        </div>
                    </div>
                </div>

                <nav aria-label="Choose what brings you here" className="nb-exit-fade flex flex-wrap items-center gap-x-3 gap-y-2 pt-6 border-t border-gray-950/10 dark:border-white/10">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500 mr-1">I'm</span>
                    {AUDIENCES.map((a) => a.href
                        ? <a key={a.key} href={a.href} className={pillCls}>{a.label} <ArrowUpRight size={14} className="ml-1.5" aria-hidden="true" /></a>
                        : <Link key={a.key} to={a.to} onClick={() => (a.to === '/#enquire' ? onChooseAudience(a.key) : undefined)} className={pillCls}>{a.label} <ArrowRight size={14} className="ml-1.5" aria-hidden="true" /></Link>)}
                    <span className="ml-auto hidden md:flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">Scroll <span aria-hidden="true" className="w-10 h-px bg-current" /></span>
                </nav>
            </div>
        </section>
    );
}
