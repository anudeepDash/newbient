const ITEMS = ['College fests', 'Live shows', 'Creator campaigns', 'Brand pop-ups', 'Campus takeovers', 'Artist nights', 'Guestlists', 'Club nights'];

function Band({ items, className, trackClass }) {
    const row = [...items, ...items];
    return (
        <div className={`w-[110%] -ml-[5%] py-3 md:py-4 ${className}`}>
            <ul className={trackClass}>
                {row.map((t, i) => (
                    <li key={i} aria-hidden={i >= items.length || undefined} className="flex items-center shrink-0 font-heading font-black uppercase tracking-tight text-xl sm:text-2xl md:text-4xl px-4 md:px-6">
                        {t}
                        <span className="ml-8 md:ml-12 text-base md:text-2xl" aria-hidden="true">✦</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Two crossing ticker bands of what Newbi runs, between the hero and the rest of the page.
export default function Ticker() {
    return (
        <section aria-label="What we run" className="relative overflow-hidden py-10 md:py-16">
            <Band items={ITEMS} className="-rotate-2 bg-neon-green text-black" trackClass="nb-ticker" />
            <Band items={[...ITEMS].reverse()} className="rotate-[1.5deg] -mt-3 bg-gray-950 text-white dark:bg-white dark:text-black" trackClass="nb-ticker-rev" />
        </section>
    );
}
