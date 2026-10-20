// Cards that pile up as you scroll: each one pins just below the last, and the
// ones underneath settle back and darken (CSS sticky + a scroll-driven animation
// on the list's timeline; without that support they simply stack and pin).
import { useT } from '../../i18n';

export default function StackCards({ items, label = 'Step' }) {
    const t = useT();
    return (
        <ul className="nb-stack space-y-[14vh] lg:space-y-[20vh] pb-[8vh]">
            {items.map((c, i) => (
                <li key={c.t} className="nb-stack-card" style={{ '--i': i }}>
                    <div className="relative overflow-hidden rounded-[1.75rem] border border-gray-950/10 dark:border-white/10 bg-[#F4F2EC] dark:bg-[#0b0e13] p-7 md:p-10 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.35)]">
                        <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full" style={{ background: `radial-gradient(closest-side, rgba(57,255,20,${(0.1 + i * 0.04).toFixed(2)}), transparent)` }} />
                        <div className="relative flex items-start justify-between gap-6">
                            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-700 dark:text-neon-green">{t(label)} 0{i + 1}</span>
                            <span className="font-heading font-extrabold tracking-[-0.04em] text-5xl md:text-6xl leading-none nb-ghost" aria-hidden="true">0{i + 1}</span>
                        </div>
                        <h3 className="relative mt-6 font-heading font-extrabold tracking-[-0.03em] text-4xl md:text-5xl lg:text-6xl leading-[0.95] text-gray-950 dark:text-white">{t(c.t)}</h3>
                        <p className="relative mt-4 max-w-md text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{t(c.d)}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}
