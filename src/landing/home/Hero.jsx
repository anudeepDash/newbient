import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Zap, Star, Megaphone, GraduationCap, Sparkles, Ticket } from 'lucide-react';
import { LogoImage } from '../components/Logo';
import { APP_LINKS } from '../links';

const AUDIENCES = [
    { key: 'brand', icon: Megaphone, title: 'Brands', text: 'Reach students and young India, on campus and online.', to: '/#enquire' },
    { key: 'college', icon: GraduationCap, title: 'Colleges', text: 'Fests, live nights and sponsors for your campus.', to: '/#enquire' },
    { key: 'creator', icon: Sparkles, title: 'Creators', text: 'Paid brand campaigns and access to live events.', to: '/creator' },
    { key: 'fan', icon: Ticket, title: 'Fans', text: 'Guestlists, passes and giveaways in the app.', href: APP_LINKS.home },
];

const tileCls = 'group h-full flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.08] hover:border-black/25 dark:hover:border-neon-green/50 hover:bg-white dark:hover:bg-white/[0.06] transition-colors text-left';

function Tile({ a, onChooseAudience }) {
    const Arrow = a.href ? ArrowUpRight : ArrowRight;
    const body = (
        <>
            <span className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-white/[0.08] flex items-center justify-center group-hover:bg-neon-green group-hover:text-black transition-colors">
                    <a.icon size={18} aria-hidden="true" />
                </span>
                <Arrow size={17} className="text-gray-400 dark:text-zinc-500 group-hover:text-gray-950 dark:group-hover:text-neon-green transition-colors" aria-hidden="true" />
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

/*
 * Home hero, in the spirit of the original newbi.live: the big centred mark and
 * "The Pulse of Youth.", then plainly what Newbi does, the main action, and a
 * "who are you?" panel that sends each visitor to the right place. Nothing
 * fades in; the floating shapes move only on larger screens.
 */
export default function Hero({ onChooseAudience }) {
    return (
        <section className="relative overflow-hidden bg-gray-50 dark:bg-dark">
            <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.05] text-black dark:text-white" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 45% at 50% 0%, rgba(57,255,20,0.14), transparent 70%)' }} />
                <div className="nb-hero-vignette absolute inset-0" />
                <div className="nb-float-a absolute top-[14%] right-[7%] w-52 h-52 rounded-3xl border border-black/5 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] md:backdrop-blur-2xl hidden lg:flex items-center justify-center">
                    <Zap className="w-14 h-14 text-black/15 dark:text-white/15" />
                </div>
                <div className="nb-float-b absolute top-[46%] left-[6%] w-40 h-40 rounded-3xl border border-black/5 dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] md:backdrop-blur-2xl hidden lg:flex items-center justify-center">
                    <Star className="w-12 h-12 -rotate-45 text-black/15 dark:text-white/15" />
                </div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 md:pt-20 pb-12 md:pb-16">
                <div className="nb-hero-exit text-center">
                    <p className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-700 dark:text-zinc-300">
                        <span className="relative flex w-2 h-2">
                            <span className="nb-ping absolute inset-0 rounded-full bg-neon-green/70" />
                            <span className="relative w-2 h-2 rounded-full bg-neon-green" />
                        </span>
                        Entertainment &amp; marketing · India
                    </p>

                    <div className="mt-7 md:mt-9 flex justify-center">
                        <LogoImage height={72} className="sm:!h-24 md:!h-32 drop-shadow-[0_12px_24px_rgba(0,0,0,0.10)] dark:drop-shadow-[0_12px_30px_rgba(57,255,20,0.10)]" priority />
                    </div>

                    <h1 className="mt-6 md:mt-8 font-heading font-black tracking-tight leading-[0.95] text-[clamp(3rem,13vw,8.5rem)] text-gray-950 dark:text-white">
                        The Pulse of <span className="nb-gradient">Youth.</span>
                    </h1>

                    <p className="mt-6 md:mt-8 mx-auto max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-gray-600 dark:text-zinc-400">
                        We plan and run <strong className="font-semibold text-gray-950 dark:text-white">college activations</strong>,{' '}
                        <strong className="font-semibold text-gray-950 dark:text-white">live shows</strong> and{' '}
                        <strong className="font-semibold text-gray-950 dark:text-white">creator campaigns</strong> across India, from the first idea to the night itself.
                    </p>

                    <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            to="/#enquire"
                            className="group w-full sm:w-auto h-14 md:h-16 px-9 inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 text-white dark:bg-neon-green dark:text-black font-bold uppercase tracking-[0.18em] text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition"
                        >
                            Work with us <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                        </Link>
                        <Link
                            to="/#work"
                            className="w-full sm:w-auto h-14 md:h-16 px-9 inline-flex items-center justify-center rounded-2xl border border-black/15 dark:border-white/15 bg-white/70 dark:bg-white/[0.03] text-gray-950 dark:text-white font-bold uppercase tracking-[0.18em] text-xs hover:bg-white dark:hover:bg-white/[0.07] transition-colors"
                        >
                            See our work
                        </Link>
                    </div>
                </div>

                <nav aria-label="Choose what brings you here" className="mt-12 md:mt-16 p-2 sm:p-3 rounded-[1.75rem] border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.02] dark:bg-white/[0.02]">
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
