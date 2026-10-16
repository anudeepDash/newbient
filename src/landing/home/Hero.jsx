import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Megaphone, GraduationCap, Sparkles, Ticket } from 'lucide-react';
import { LogoImage } from '../components/Logo';
import { APP_LINKS, sizedImage } from '../links';

const tileCls = 'group relative flex flex-col justify-between gap-6 min-h-[124px] p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08] hover:border-gray-950/30 dark:hover:border-neon-green/50 hover:-translate-y-0.5 transition text-left';

function TileBody({ icon: Icon, title, text, external }) {
    const Arrow = external ? ArrowUpRight : ArrowRight;
    return (
        <>
            <span className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-gray-900 dark:text-white group-hover:bg-neon-green group-hover:text-black transition-colors">
                    <Icon size={19} aria-hidden="true" />
                </span>
                <Arrow size={18} className="text-gray-400 dark:text-zinc-500 group-hover:text-gray-950 dark:group-hover:text-neon-green group-hover:translate-x-0.5 transition" aria-hidden="true" />
            </span>
            <span className="block">
                <span className="block font-heading text-lg font-bold text-gray-950 dark:text-white">{title}</span>
                <span className="block mt-1 text-[13px] sm:text-sm leading-snug text-gray-600 dark:text-zinc-400">{text}</span>
            </span>
        </>
    );
}

// A photo that fades in once loaded (and still shows if it was already cached before hydration).
function FadeImage({ src, width, height }) {
    const ref = useRef(null);
    useEffect(() => {
        const img = ref.current;
        if (img?.complete && img.naturalWidth) img.style.opacity = '1';
    }, [src]);
    return (
        <img
            ref={ref}
            src={src}
            alt=""
            width={width}
            height={height}
            decoding="async"
            onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700"
        />
    );
}

// The photo "stage" beside the headline (large screens). Each card is labelled with a
// service; the photos are real event shots from the portfolio, added once the feed loads.
const STAGE = [
    { label: 'College fests', pos: { left: '2%', top: '16%' }, rotate: -8, fan: ['-36px', '-24px', '-5deg'], float: ['7s', '0s'], tint: 'from-emerald-400/40 via-emerald-900/40 to-black' },
    { label: 'Live shows', pos: { left: '31%', top: '0%' }, rotate: 3, fan: ['6px', '-84px', '3deg'], float: ['8s', '-2.5s'], tint: 'from-fuchsia-500/40 via-purple-900/40 to-black' },
    { label: 'Creator campaigns', pos: { left: '50%', top: '36%' }, rotate: 9, fan: ['44px', '-16px', '7deg'], float: ['6.5s', '-4s'], tint: 'from-cyan-400/40 via-sky-900/40 to-black' },
];

function Stage({ images }) {
    return (
        <div className="relative hidden lg:block h-[500px]" aria-hidden="true">
            {STAGE.map((card, i) => {
                const photo = images[i];
                return (
                    <div
                        key={card.label}
                        className="nb-fan absolute"
                        style={{ ...card.pos, zIndex: [1, 3, 2][i], '--fx': card.fan[0], '--fy': card.fan[1], '--fr': card.fan[2] }}
                    >
                        <div className="nb-float" style={{ '--t': card.float[0], '--fd': card.float[1] }}>
                            <figure
                                className={`relative w-[250px] xl:w-[270px] aspect-[4/5] rounded-[28px] overflow-hidden border border-black/10 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] bg-gradient-to-br ${card.tint}`}
                                style={{ transform: `rotate(${card.rotate}deg)` }}
                            >
                                {photo && <FadeImage src={sizedImage(photo.src, 560)} width={540} height={675} />}
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                                <figcaption className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" /> {card.label}
                                </figcaption>
                            </figure>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function Hero({ onChooseAudience, images = [] }) {
    return (
        <section className="relative overflow-hidden">
            {/* Backdrop: soft colour fields (gradients, not blur filters) and a faint grid on larger screens. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="nb-aurora absolute -top-[30%] -right-[25%] w-[70rem] h-[45rem] max-w-none" style={{ background: 'radial-gradient(closest-side, rgba(57,255,20,0.16), transparent)' }} />
                <div className="nb-aurora absolute top-[35%] -left-[35%] w-[55rem] h-[38rem] max-w-none" style={{ background: 'radial-gradient(closest-side, rgba(0,240,255,0.08), transparent)', animationDelay: '-9s' }} />
                <div
                    className="hidden md:block absolute inset-0 opacity-60 dark:opacity-100"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(127,127,127,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(127,127,127,0.07) 1px, transparent 1px)',
                        backgroundSize: '64px 64px',
                        maskImage: 'radial-gradient(ellipse at 70% 30%, #000 20%, transparent 70%)',
                        WebkitMaskImage: 'radial-gradient(ellipse at 70% 30%, #000 20%, transparent 70%)',
                    }}
                />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 sm:pt-14 md:pt-16 lg:pt-12 md:pb-20">
                <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-4 items-center">
                    <div className="nb-hero-exit max-w-4xl">
                        <div className="flex items-center gap-4 mb-5 sm:mb-8">
                            <LogoImage height={40} className="sm:!h-[56px] md:!h-[64px]" priority />
                            <p className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                <span className="relative flex w-2 h-2">
                                    <span className="nb-ping absolute inset-0 rounded-full bg-neon-green/70" />
                                    <span className="relative w-2 h-2 rounded-full bg-neon-green" />
                                </span>
                                Youth marketing &amp; live entertainment
                            </p>
                        </div>
                        <h1 className="font-heading text-[2.05rem] leading-[1.1] sm:text-6xl lg:text-[3.6rem] xl:text-[4.1rem] sm:leading-[1.05] font-bold tracking-tight text-gray-950 dark:text-white">
                            We run{' '}
                            <span className="nb-mark" style={{ '--d': '0.15s' }}>college activations</span>,{' '}
                            <span className="nb-mark" style={{ '--d': '0.45s', '--mark': '#00D9E8' }}>live shows</span> and{' '}
                            <span className="nb-mark" style={{ '--d': '0.75s', '--mark': '#FF4F8B' }}>creator campaigns</span>{' '}
                            across India.
                        </h1>
                        <p className="mt-4 sm:mt-6 text-[15px] sm:text-lg md:text-xl leading-relaxed text-gray-600 dark:text-zinc-400 max-w-2xl">
                            From the first idea to the night itself, for brands that want to reach students, colleges planning a fest, and artists who want a crowd.
                        </p>
                        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/#enquire"
                                className="group h-14 px-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-neon-green text-black text-base font-bold shadow-[0_10px_30px_-10px_rgba(57,255,20,0.7)] hover:brightness-95 active:scale-[0.98] transition"
                            >
                                Work with us <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                            </Link>
                            <Link
                                to="/#work"
                                className="hidden sm:inline-flex h-14 px-7 items-center justify-center rounded-2xl border border-black/10 dark:border-white/15 text-base font-semibold text-gray-900 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                            >
                                See our work
                            </Link>
                        </div>
                    </div>

                    <Stage images={images} />
                </div>

                <nav aria-label="Choose what brings you here" className="mt-8 md:mt-14">
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-500 mb-3">I'm here as…</p>
                    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <li>
                            <Link to="/#enquire" onClick={() => onChooseAudience('brand')} className={tileCls}>
                                <TileBody icon={Megaphone} title="A brand" text="Reach students and young audiences, on campus and online." />
                            </Link>
                        </li>
                        <li>
                            <Link to="/#enquire" onClick={() => onChooseAudience('college')} className={tileCls}>
                                <TileBody icon={GraduationCap} title="A college" text="Fests, live shows and sponsors for your campus." />
                            </Link>
                        </li>
                        <li>
                            <Link to="/creator" className={tileCls}>
                                <TileBody icon={Sparkles} title="A creator" text="Brand campaigns and event access, matched to you." />
                            </Link>
                        </li>
                        <li>
                            <a href={APP_LINKS.home} className={tileCls}>
                                <TileBody icon={Ticket} title="A fan" text="Guestlists, passes and giveaways in the Newbi app." external />
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </section>
    );
}
