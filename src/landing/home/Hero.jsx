import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Megaphone, GraduationCap, Sparkles, Ticket } from 'lucide-react';
import { LogoImage } from '../components/Logo';
import { APP_LINKS } from '../links';

const AUDIENCES = [
    { key: 'brand', icon: Megaphone, title: 'Brands', text: 'Reach students and young India, on campus and online.', to: '/#enquire' },
    { key: 'college', icon: GraduationCap, title: 'Colleges', text: 'Fests, live nights and sponsors for your campus.', to: '/#enquire' },
    { key: 'creator', icon: Sparkles, title: 'Creators', text: 'Paid brand campaigns and access to live events.', to: '/creator' },
    { key: 'fan', icon: Ticket, title: 'Fans', text: 'Guestlists, passes and giveaways in the app.', href: APP_LINKS.home },
];

const WORDS = ['college fests', 'live shows', 'creator campaigns', 'brand pop-ups'];

// Equalizer bars: fixed pseudo-random values, so the prerendered HTML and the browser agree.
const BARS = Array.from({ length: 56 }, (_, i) => ({
    h: 28 + ((i * 37) % 64),
    d: (0.7 + ((i * 13) % 9) / 10).toFixed(2),
    delay: (-((i * 7) % 10) / 10).toFixed(1),
}));

const tileCls = 'group h-full flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.08] hover:border-black/25 dark:hover:border-neon-green/50 hover:bg-white dark:hover:bg-white/[0.06] hover:-translate-y-1 transition text-left';

function Tile({ a, onChooseAudience }) {
    const Arrow = a.href ? ArrowUpRight : ArrowRight;
    const body = (
        <>
            <span className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-white/[0.08] flex items-center justify-center group-hover:bg-neon-green group-hover:text-black group-hover:rotate-[-8deg] transition">
                    <a.icon size={18} aria-hidden="true" />
                </span>
                <Arrow size={17} className="text-gray-400 dark:text-zinc-500 group-hover:text-gray-950 dark:group-hover:text-neon-green group-hover:translate-x-0.5 transition" aria-hidden="true" />
            </span>
            <span>
                <span className="block font-heading text-base sm:text-lg font-extrabold text-gray-950 dark:text-white">{a.title}</span>
                <span className="block mt-1 text-[13px] leading-snug text-gray-600 dark:text-zinc-400">{a.text}</span>
            </span>
        </>
    );
    if (a.href) return <a href={a.href} className={tileCls}>{body}</a>;
    return <Link to={a.to} onClick={() => (a.to === '/#enquire' ? onChooseAudience(a.key) : undefined)} className={tileCls}>{body}</Link>;
}

// A soft light that follows the pointer (mouse and trackpad only; off for reduced motion).
function useSpotlight() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el || !window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        const section = el.parentElement;
        let frame = 0;
        const move = (e) => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const r = section.getBoundingClientRect();
                el.style.setProperty('--mx', `${e.clientX - r.left}px`);
                el.style.setProperty('--my', `${e.clientY - r.top}px`);
                el.style.opacity = '1';
            });
        };
        const leave = () => { el.style.opacity = '0'; };
        section.addEventListener('pointermove', move);
        section.addEventListener('pointerleave', leave);
        return () => { cancelAnimationFrame(frame); section.removeEventListener('pointermove', move); section.removeEventListener('pointerleave', leave); };
    }, []);
    return ref;
}

/*
 * Home hero. The original newbi.live energy (big mark, "The Pulse of Youth."),
 * staged like a show: swinging stage lights, a live equalizer along the bottom,
 * a rotating line of what Newbi runs and a pointer spotlight on desktop.
 * All text is there on first paint; the motion is CSS and stops for people who
 * prefer reduced motion.
 */
export default function Hero({ onChooseAudience }) {
    const spotlight = useSpotlight();
    return (
        <section className="relative overflow-hidden bg-gray-50 dark:bg-dark">
            <div ref={spotlight} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500" style={{ background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 30%), rgba(57,255,20,0.10), transparent 70%)' }} />

            <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.05] text-black dark:text-white" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                {/* Stage lights */}
                <div className="nb-beam nb-beam-l absolute -top-8 left-[2%] sm:left-[14%] w-[22rem] sm:w-[36rem] h-[115%] opacity-70 dark:opacity-100" style={{ background: 'linear-gradient(180deg, rgba(57,255,20,0.34), rgba(57,255,20,0.06) 55%, transparent 80%)' }} />
                <div className="nb-beam nb-beam-r absolute -top-8 right-[2%] sm:right-[14%] w-[22rem] sm:w-[36rem] h-[115%] opacity-60 dark:opacity-90" style={{ background: 'linear-gradient(180deg, rgba(0,240,255,0.28), rgba(0,240,255,0.05) 55%, transparent 80%)' }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(55% 40% at 50% 0%, rgba(57,255,20,0.12), transparent 70%)' }} />
                <div className="nb-hero-vignette absolute inset-0" />
            </div>

            <div className="relative z-[2] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 md:pt-20 pb-12 md:pb-16">
                <div className="nb-hero-exit relative text-center">
                    {/* The pulse: equalizer bars behind the headline and actions */}
                    <div aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 bottom-[-2rem] md:bottom-[-3rem] w-screen max-w-[1400px] h-56 md:h-80 -z-10 flex items-end justify-center gap-[3px] md:gap-[6px] opacity-50 dark:opacity-[0.45]" style={{ maskImage: 'linear-gradient(to top, #000 35%, transparent)', WebkitMaskImage: 'linear-gradient(to top, #000 35%, transparent)' }}>
                        {BARS.map((b, i) => (
                            <span
                                key={i}
                                className={`nb-eq w-[5px] md:w-2 rounded-t-full bg-gradient-to-t from-neon-green to-neon-green/10 ${i % 2 ? 'hidden md:block' : ''}`}
                                style={{ height: `${b.h}%`, '--eq-d': `${b.d}s`, '--eq-delay': `${b.delay}s` }}
                            />
                        ))}
                    </div>
                    <p className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-700 dark:text-zinc-300">
                        <span className="relative flex w-2 h-2">
                            <span className="nb-ping absolute inset-0 rounded-full bg-neon-green/70" />
                            <span className="relative w-2 h-2 rounded-full bg-neon-green" />
                        </span>
                        Entertainment &amp; marketing · India
                    </p>

                    <div className="mt-7 md:mt-9 flex justify-center">
                        <LogoImage height={72} className="sm:!h-24 md:!h-32 drop-shadow-[0_12px_24px_rgba(0,0,0,0.10)] dark:drop-shadow-[0_12px_30px_rgba(57,255,20,0.12)]" priority />
                    </div>

                    <h1 className="mt-6 md:mt-8 font-heading font-black tracking-tight leading-[0.95] text-[clamp(3rem,13vw,8.5rem)] text-gray-950 dark:text-white">
                        The Pulse of <span className="nb-shimmer">Youth.</span>
                    </h1>

                    <p className="mt-6 md:mt-8 font-heading text-xl sm:text-2xl md:text-3xl font-bold text-gray-950 dark:text-white">
                        <span className="sr-only">We run college activations, live shows, creator campaigns and brand pop-ups across India.</span>
                        <span aria-hidden="true">
                            We run{' '}
                            <span className="nb-rotator block sm:inline-block mx-auto text-center sm:text-left text-emerald-600 dark:text-neon-green">
                                <span className="nb-rotator-track">
                                    {[...WORDS, WORDS[0]].map((w, i) => <span key={i}>{w}</span>)}
                                </span>
                            </span>
                            <span className="nb-rotator-static text-emerald-600 dark:text-neon-green">college fests, live shows and creator campaigns</span>
                        </span>
                    </p>
                    <p className="mt-3 mx-auto max-w-xl text-base sm:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">
                        Across India, from the first idea to the night itself, for brands, colleges and artists.
                    </p>

                    <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            to="/#enquire"
                            className="group relative overflow-hidden w-full sm:w-auto h-14 md:h-16 px-9 inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 text-white dark:bg-neon-green dark:text-black font-bold uppercase tracking-[0.18em] text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition"
                        >
                            <span aria-hidden="true" className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                            <span className="relative inline-flex items-center gap-2">Work with us <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" /></span>
                        </Link>
                        <Link
                            to="/#work"
                            className="w-full sm:w-auto h-14 md:h-16 px-9 inline-flex items-center justify-center rounded-2xl border border-black/15 dark:border-white/15 bg-white/70 dark:bg-black/40 text-gray-950 dark:text-white font-bold uppercase tracking-[0.18em] text-xs hover:bg-white dark:hover:bg-white/[0.07] transition-colors"
                        >
                            See our work
                        </Link>
                    </div>
                </div>

                <nav aria-label="Choose what brings you here" className="mt-12 md:mt-16 p-2 sm:p-3 rounded-[1.75rem] border border-black/[0.06] dark:border-white/[0.08] bg-white/40 dark:bg-black/30">
                    <p className="px-3 pt-2 pb-3 text-[11px] font-black uppercase tracking-[0.25em] text-gray-500 dark:text-zinc-500">Who are you?</p>
                    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        {AUDIENCES.map((a) => (
                            <li key={a.key}><Tile a={a} onChooseAudience={onChooseAudience} /></li>
                        ))}
                    </ul>
                </nav>
            </div>
        </section>
    );
}
