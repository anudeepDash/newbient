import { sizedImage } from '../links';

const LOGO_H = 40;

function ClientMark({ client, dupe }) {
    const ratio = client.logoWidth && client.logoHeight ? client.logoWidth / client.logoHeight : 3;
    return (
        <li
            data-dupe={dupe || undefined}
            aria-hidden={dupe || undefined}
            className="shrink-0 h-16 px-6 mx-1.5 my-1.5 rounded-2xl bg-white border border-black/[0.06] dark:border-white/10 flex items-center justify-center"
        >
            {client.logoUrl ? (
                <img
                    src={sizedImage(client.logoUrl, 320)}
                    alt={dupe ? '' : client.name || 'Client logo'}
                    width={Math.round(LOGO_H * ratio)}
                    height={LOGO_H}
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-auto max-w-[160px] object-contain grayscale hover:grayscale-0 transition"
                />
            ) : (
                <span className="font-heading text-lg font-bold text-gray-800 whitespace-nowrap">{client.name}</span>
            )}
        </li>
    );
}

/*
 * Real proof only: client logos from `past_clients` and numbers the team has
 * entered in site settings. Nothing is shown until there is data.
 */
export default function Proof({ clients = [], stats = [] }) {
    if (!clients.length && !stats.length) return null;
    const scroll = clients.length >= 6;

    return (
        <section aria-labelledby="proof-title" className="py-12 md:py-16 border-y border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.015]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="nb-reveal flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-zinc-400">
                    <span className="w-6 h-px bg-neon-green" aria-hidden="true" />
                    <span id="proof-title">{clients.length ? 'Trusted by brands, venues and colleges' : 'Newbi in numbers'}</span>
                </p>
            </div>

            {clients.length > 0 && (
                <div className="mt-6 overflow-hidden" style={scroll ? { maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)' } : undefined}>
                    <ul className={scroll ? 'nb-marquee' : 'flex flex-wrap justify-center max-w-7xl mx-auto px-4'}>
                        {clients.map((c) => <ClientMark key={c.id} client={c} />)}
                        {scroll && clients.map((c) => <ClientMark key={`${c.id}-dupe`} client={c} dupe />)}
                    </ul>
                </div>
            )}

            {stats.length > 0 && (
                <dl className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                    {stats.map((s) => (
                        <div key={s.label}>
                            <dt className="sr-only">{s.label}</dt>
                            <dd className="font-heading text-4xl md:text-5xl font-black text-gray-950 dark:text-white tabular-nums">{s.value}</dd>
                            <dd className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{s.label}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    );
}
