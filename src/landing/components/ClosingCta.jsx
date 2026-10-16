import Sticker from './Sticker';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

// The big line before the footer, with one way in.
export default function ClosingCta({ title, highlight, text, cta }) {
    const Arrow = cta.href ? ArrowUpRight : ArrowRight;
    const cls = 'group mt-8 inline-flex h-14 px-8 items-center gap-2 rounded-full bg-neon-green text-black font-heading font-bold text-base hover:scale-[1.03] active:scale-[0.98] transition';
    return (
        <section aria-labelledby="closing-title" className="[--nb-ghost:rgba(255,255,255,0.42)] relative overflow-hidden py-24 md:py-36 bg-gray-950 text-white dark:bg-[#0a0a0a] border-t border-white/10">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(60% 70% at 50% 120%, rgba(57,255,20,0.25), transparent 70%)' }} />
            <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                <h2 id="closing-title" className="nb-reveal font-heading font-extrabold tracking-[-0.04em] leading-[0.9] text-[2.8rem] sm:text-6xl lg:text-7xl xl:text-[6rem] max-w-5xl">
                    {title} <Sticker subtle>{highlight}</Sticker>
                </h2>
                {text && <p className="nb-reveal mt-6 max-w-xl text-lg text-zinc-300">{text}</p>}
                <div className="nb-reveal">
                    {cta.href
                        ? <a href={cta.href} className={cls}>{cta.label} <Arrow size={18} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" /></a>
                        : <Link to={cta.to} className={cls}>{cta.label} <Arrow size={18} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" /></Link>}
                </div>
            </div>
        </section>
    );
}
