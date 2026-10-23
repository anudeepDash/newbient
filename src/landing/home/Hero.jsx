import Sticker from '../components/Sticker';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Megaphone, Ticket, Music2 } from 'lucide-react';
import { APP_LINKS } from '../links';
import newbiIcon from '../../assets/logo/newbi-icon.svg';
import { useT } from '../../i18n';

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

export function BrandArt({ tags = TAGS }) {
    const t = useT();
    return (
        // Phones: a small mark at the top of the hero. Desktop: the big visual on the right.
        <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[460px]">
            <div className="absolute inset-[12%] rounded-full bg-neon-green/25 blur-3xl dark:bg-neon-green/15" />
            <div className="absolute inset-[14%] rounded-[3rem] border border-gray-950/10 dark:border-white/10" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '18px 18px', color: 'rgba(0,0,0,0.12)' }} />
            <img src={newbiIcon} alt="" width="579" height="476" className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] drop-shadow-[0_24px_40px_rgba(0,0,0,0.25)]" />
            {tags.map((tag) => (
                <span key={tag.label} className={`nb-float absolute ${tag.pos}`} style={{ animationDelay: tag.delay }}>
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-2.5 py-1.5 font-heading text-[11px] font-extrabold shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] sm:gap-2 sm:border-[3px] sm:px-4 sm:py-2.5 sm:text-[15px] ${tag.tilt} ${tag.accent
                        ? 'border-black bg-neon-green text-black'
                        : 'border-black bg-white text-gray-950 dark:border-white/80 dark:bg-[#111] dark:text-white'}`}>
                        <tag.icon className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" /> {t(tag.label)}
                    </span>
                </span>
            ))}
        </div>
    );
}

/*
 * Home hero, for everyone. Desktop: the headline, what we do and the two actions
 * (join free, or the brand section further down) on the left,
 * the brand mark with what we do around it on the right.
 * Phones: the mark first (small), then the headline and actions. The headline
 * lines still slide apart as you scroll away (CSS, off for reduced motion).
 */
export default function Hero({ onChooseAudience }) {
    const t = useT();
    return (
        <section className="relative overflow-hidden">
            {/* A soft colour wash instead of the grid: neon from the top right, a cool tint bottom left. */}
            <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'radial-gradient(55% 55% at 88% 8%, rgba(57,255,20,0.32), transparent 70%), radial-gradient(45% 50% at 0% 85%, rgba(56,189,248,0.16), transparent 70%), radial-gradient(40% 40% at 45% 40%, rgba(255,255,255,0.7), transparent 70%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'radial-gradient(55% 55% at 88% 8%, rgba(57,255,20,0.20), transparent 70%), radial-gradient(45% 50% at 0% 85%, rgba(56,189,248,0.10), transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.035] text-black dark:text-white" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(to bottom, #000 30%, transparent 80%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 30%, transparent 80%)' }} />
            </div>

            <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-12 pt-4 sm:px-6 sm:pt-10 md:pt-16 lg:px-10 lg:pb-16">
                {/* Phones: the N. mark (small), then the headline and actions.
                    Desktop: headline | brand art. */}
                <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-10">
                    <div className="order-2 lg:order-1">
                        <h1 className="font-heading font-extrabold leading-[0.92] tracking-[-0.045em] text-gray-950 dark:text-white text-[15vw] sm:text-[11vw] lg:text-[6.6vw] 2xl:text-[7.6rem]">
                            <span className="nb-exit-l block">{t('We make')}</span>{' '}
                            <span className="nb-exit-r block">{t('young India')}</span>{' '}
                            <span className="nb-exit-l block"><Sticker tilt="-rotate-[2deg]">{t('show up.')}</Sticker></span>
                        </h1>
                        <p className="nb-exit-fade mt-6 max-w-md text-lg leading-snug text-gray-700 dark:text-zinc-300 md:text-xl">
                            {t('Live shows, guestlists and paid creator campaigns across India. One free account gets you in.')}
                        </p>
                        <div className="nb-exit-fade mt-8 flex flex-col gap-3 sm:flex-row">
                            <a href={APP_LINKS.community} className="group inline-flex h-14 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-neon-green px-8 font-heading text-base font-extrabold text-black shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:translate-y-0 active:shadow-[2px_2px_0_#000]">
                                {t('Join free')} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </a>
                            <Link to="/#brands" onClick={() => onChooseAudience?.('brand')} className="inline-flex h-14 items-center justify-center rounded-full bg-white/60 px-8 font-heading text-base font-bold text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-12px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-black/[0.08] backdrop-blur-xl transition hover:bg-white/80 dark:bg-white/[0.08] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:ring-white/15 dark:hover:bg-white/[0.14]">
                                {t('For brands & colleges')}
                            </Link>
                        </div>
                    </div>

                    <div className="order-1 -mb-2 lg:order-2 lg:mb-0">
                        <BrandArt />
                    </div>

                </div>
            </div>
        </section>
    );
}
