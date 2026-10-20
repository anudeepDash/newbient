// A numbered vertical timeline. The green line draws itself as you scroll and
// each step lights up as it passes the middle of the screen (CSS only).
import { useT } from '../../i18n';

export default function Timeline({ steps, label = 'Step' }) {
    const t = useT();
    return (
        <ol className="relative pl-10 md:pl-14">
            <span aria-hidden="true" className="absolute left-[11px] md:left-[15px] top-2 bottom-2 w-px bg-gray-950/10 dark:bg-white/10" />
            <span aria-hidden="true" className="nb-line absolute left-[11px] md:left-[15px] top-2 bottom-2 w-px bg-neon-green" />
            {steps.map((s, i) => (
                <li key={s.t} className="relative py-8 md:py-12 first:pt-0 last:pb-0">
                    <span aria-hidden="true" className="nb-step-dot absolute -left-10 md:-left-14 top-8 md:top-12 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-gray-950/20 dark:border-white/25 bg-[var(--bg-primary)]" style={i === 0 ? { top: 0 } : undefined} />
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">{t(label)} 0{i + 1}</p>
                    <h3 className="mt-2 font-heading font-extrabold tracking-[-0.03em] text-4xl md:text-6xl text-gray-950 dark:text-white">{t(s.t)}</h3>
                    <p className="mt-3 max-w-lg text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">{t(s.d)}</p>
                </li>
            ))}
        </ol>
    );
}
