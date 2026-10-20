// The small glass chip above every section title (same as the hero's chip):
// a neon dot, the section number and its name. `dark` is for sections that
// always sit on black (Selected work, Why Newbi).
import { useT } from '../../i18n';

export default function SectionLabel({ index, children, dark = false, center = false }) {
    const t = useT();
    return (
        <p className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] ring-1 ring-inset backdrop-blur-md ${center ? 'mx-auto' : ''} ${dark
            ? 'bg-white/[0.06] text-zinc-300 ring-white/10'
            : 'bg-white/60 text-gray-700 ring-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-300 dark:ring-white/10'}`}>
            <span className="h-2 w-2 rounded-full bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.9)]" aria-hidden="true" />
            {index && <span className={dark ? 'text-white' : 'text-gray-950 dark:text-white'}>{index}</span>}
            {index && children && <span aria-hidden="true" className="opacity-40">·</span>}
            {typeof children === 'string' ? t(children) : children}
        </p>
    );
}
