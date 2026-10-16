import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// A big closing line that slides with the scroll, then the way in.
export default function CtaBand() {
    return (
        <section aria-labelledby="cta-title" className="relative overflow-hidden py-16 md:py-24 bg-gray-950 text-white">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(60% 80% at 50% 120%, rgba(57,255,20,0.25), transparent 70%)' }} />
            <p aria-hidden="true" className="nb-slide relative whitespace-nowrap font-heading font-black uppercase tracking-tight text-[18vw] md:text-[11vw] leading-none text-white/[0.08]">
                Let's make some noise ✦ Let's make some noise
            </p>
            <div className="relative -mt-[8vw] md:-mt-[5vw] max-w-3xl mx-auto px-4 text-center">
                <h2 id="cta-title" className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">
                    Got a fest, a launch or a <span className="text-neon-green">big night</span> coming up?
                </h2>
                <Link to="/#enquire" className="group mt-8 inline-flex h-14 px-9 items-center gap-2 rounded-2xl bg-neon-green text-black font-bold uppercase tracking-[0.18em] text-sm hover:scale-[1.03] active:scale-[0.98] transition">
                    Start a project <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}
