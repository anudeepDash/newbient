const WORDS = ['Complete event support', 'On-ground management', 'Artist management', 'Campus activations', 'Brand activations', 'Influencer campaigns', 'PR & media', 'Digital & social'];

// One line of what Newbi runs, outlined and filled in turn, drifting across the page.
export default function Marquee() {
    const row = [...WORDS, ...WORDS];
    return (
        <section aria-label="What we run" className="overflow-hidden border-y border-gray-950/10 dark:border-white/10 py-5 md:py-7">
            <ul className="nb-marquee nb-marquee-fast items-center">
                {row.map((w, i) => (
                    <li key={i} aria-hidden={i >= WORDS.length || undefined} className={`shrink-0 flex items-center font-heading font-extrabold tracking-[-0.02em] text-4xl md:text-6xl px-5 md:px-8 text-gray-950 dark:text-white ${i % 2 ? 'nb-ghost' : ''}`}>
                        {w}
                        <span aria-hidden="true" className="ml-10 md:ml-16 w-3 h-3 md:w-4 md:h-4 rounded-full bg-neon-green" />
                    </li>
                ))}
            </ul>
        </section>
    );
}
