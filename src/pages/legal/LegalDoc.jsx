import React, { useEffect, useState } from 'react';
import Sticker from '../../landing/components/Sticker';
import SectionLabel from '../../landing/components/SectionLabel';

/*
 * The long-form layout for newbi.live/terms and /privacy: the landing hero
 * look on top, then a readable column with a sticky index on wide screens.
 * Each section has an id, so its heading can be linked to
 * (newbi.live/privacy#delete-your-data is the data-deletion address Meta asks for).
 */

export const P = ({ children }) => <p className="text-base leading-relaxed text-gray-700 dark:text-zinc-300">{children}</p>;

export const UL = ({ items }) => (
    <ul className="space-y-2.5">
        {items.map((item, i) => (
            <li key={i} className="flex gap-3 text-base leading-relaxed text-gray-700 dark:text-zinc-300">
                <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-neon-green" aria-hidden="true" />
                <span>{item}</span>
            </li>
        ))}
    </ul>
);

export const H3 = ({ children }) => <h3 className="pt-2 font-heading text-lg font-bold tracking-[-0.01em] text-gray-950 dark:text-white">{children}</h3>;

/* A two-column list ([label, text] rows), for "who processes what". */
export const Rows = ({ rows }) => (
    <dl className="divide-y divide-gray-950/10 overflow-hidden rounded-2xl border border-gray-950/10 dark:divide-white/10 dark:border-white/10">
        {rows.map(([label, text]) => (
            <div key={label} className="grid gap-1 bg-white/60 px-5 py-4 dark:bg-white/[0.03] sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-6">
                <dt className="font-heading text-[15px] font-bold text-gray-950 dark:text-white">{label}</dt>
                <dd className="text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{text}</dd>
            </div>
        ))}
    </dl>
);

export const A = ({ href, children }) => (
    <a href={href} className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900 dark:text-neon-green dark:hover:text-white">{children}</a>
);

export default function LegalDoc({ eyebrow, title, highlight, updated, intro, sections }) {
    const [active, setActive] = useState(sections[0]?.id);

    // The page loads after the browser has tried the #fragment, so jump to it once the sections exist.
    useEffect(() => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        if (!id) return;
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ block: 'start' });
            setActive(id);
        }
    }, []);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return undefined;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
        }, { rootMargin: '-90px 0px -70% 0px' });
        sections.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
        return () => io.disconnect();
    }, [sections]);

    return (
        <div>
            <section className="relative overflow-hidden">
                <div aria-hidden="true" className="absolute inset-0">
                    <div className="absolute inset-0 dark:hidden" style={{ background: 'radial-gradient(50% 60% at 90% 0%, rgba(57,255,20,0.22), transparent 70%), radial-gradient(40% 50% at 0% 100%, rgba(56,189,248,0.12), transparent 70%)' }} />
                    <div className="absolute inset-0 hidden dark:block" style={{ background: 'radial-gradient(50% 60% at 90% 0%, rgba(57,255,20,0.14), transparent 70%), radial-gradient(40% 50% at 0% 100%, rgba(56,189,248,0.08), transparent 70%)' }} />
                </div>
                <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-12 pt-8 sm:px-6 md:pt-16 lg:px-10">
                    <SectionLabel>{eyebrow}</SectionLabel>
                    <h1 className="mt-5 font-heading text-[2.9rem] font-extrabold leading-[0.95] tracking-[-0.04em] text-gray-950 dark:text-white sm:text-6xl lg:text-7xl">
                        {title} <Sticker tilt="-rotate-[2deg]">{highlight}</Sticker>
                    </h1>
                    <p className="mt-5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">Last updated {updated}</p>
                    <div className="mt-6 max-w-2xl space-y-3 text-lg leading-relaxed text-gray-700 dark:text-zinc-300">{intro}</div>
                </div>
            </section>

            <div className="mx-auto grid w-full max-w-[1200px] gap-10 border-t border-gray-950/10 px-4 py-12 dark:border-white/10 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:px-10 lg:py-16">
                <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">On this page</p>
                    <ol className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                        {sections.map((s, i) => (
                            <li key={s.id}>
                                <a
                                    href={`#${s.id}`}
                                    aria-current={active === s.id ? 'location' : undefined}
                                    className={`flex min-h-[40px] items-center gap-3 rounded-xl px-3 text-[14px] font-semibold transition-colors ${active === s.id
                                        ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
                                        : 'text-gray-600 hover:bg-gray-950/[0.05] hover:text-gray-950 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white'}`}
                                >
                                    <span className="font-mono text-[11px] opacity-60">{String(i + 1).padStart(2, '0')}</span>
                                    {s.title}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="min-w-0 max-w-[46rem] space-y-14">
                    {sections.map((s, i) => (
                        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-28 space-y-4">
                            <h2 id={`${s.id}-title`} className="font-heading text-2xl font-extrabold tracking-[-0.02em] text-gray-950 dark:text-white md:text-3xl">
                                <span className="mr-3 font-mono text-[13px] font-bold text-emerald-700 dark:text-neon-green">{String(i + 1).padStart(2, '0')}</span>
                                {s.title}
                            </h2>
                            {s.body}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
