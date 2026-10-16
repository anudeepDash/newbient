// Why Newbi, read like lyrics: each line brightens as it passes the middle of the screen.
const LINES = [
    ['Execution, not decks.', 'We run the thing, not just plan it.'],
    ['One crew.', 'Artists, production, creators, crews, report.'],
    ['Our own network.', 'Creators and ambassadors matched by city and niche.'],
    ['Numbers after.', 'Every project ends with a report you can forward.'],
];

export default function Manifesto() {
    return (
        <section aria-labelledby="why-title" className="[--nb-ghost:rgba(255,255,255,0.42)] py-24 md:py-40 border-t border-gray-950/10 dark:border-white/10 bg-gray-950 text-white dark:bg-[#0a0a0a]">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500"><span className="text-neon-green">04</span> — Why Newbi</p>
                <h2 id="why-title" className="sr-only">Why Newbi</h2>
                <ul className="mt-10 md:mt-16 space-y-6 md:space-y-10">
                    {LINES.map(([lead, rest]) => (
                        <li key={lead} className="nb-lyric font-heading font-extrabold tracking-[-0.03em] leading-[0.95] text-[2.4rem] sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
                            <span className="text-neon-green">{lead}</span>{' '}
                            <span className="nb-ghost">{rest}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
