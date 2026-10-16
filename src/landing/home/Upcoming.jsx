import { CalendarDays, MapPin, ArrowUpRight } from 'lucide-react';
import { APP_LINKS, sizedImage } from '../links';

const formatDay = (iso) => {
    const d = new Date(`${iso}T00:00:00+05:30`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
};

const ctaLabel = (e) => (e.isTicketed ? 'Get tickets' : e.hasGuestlist ? 'Get on the list' : 'See the event');

// The next three public events from the cached feed; each opens its page in the app.
export default function Upcoming({ events = [] }) {
    if (!events.length) return null;
    return (
        <section id="upcoming" aria-labelledby="upcoming-title" className="scroll-mt-20 py-16 md:py-24 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between gap-4">
                    <h2 id="upcoming-title" className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-950 dark:text-white">Coming up</h2>
                    <a href={APP_LINKS.home} className="hidden sm:inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-950 dark:hover:text-white">
                        All events in the app <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                </div>
                <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map((e) => {
                        const where = [e.location, e.city].filter(Boolean).join(', ');
                        return (
                            <li key={e.id} className="nb-reveal">
                                <a href={APP_LINKS.event(e.id)} className="group flex h-full flex-col rounded-3xl overflow-hidden bg-white dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.08] hover:border-gray-950/30 dark:hover:border-neon-green/50 transition-colors">
                                    {e.image ? (
                                        <div className="aspect-[4/3] bg-gray-200 dark:bg-white/[0.05] overflow-hidden">
                                            <img src={sizedImage(e.image, 720)} alt="" width="720" height="540" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                        </div>
                                    ) : null}
                                    <div className="p-5 flex flex-1 flex-col">
                                        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-950 dark:text-neon-green">
                                            <CalendarDays size={15} aria-hidden="true" />
                                            {formatDay(e.date)}{e.time ? ` · ${e.time}` : ''}
                                        </p>
                                        <h3 className="mt-2 font-heading text-xl font-bold text-gray-950 dark:text-white">{e.title}</h3>
                                        {where && (
                                            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-gray-600 dark:text-zinc-400">
                                                <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {where}
                                            </p>
                                        )}
                                        <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-950 dark:text-white">
                                            {ctaLabel(e)} <ArrowUpRight size={15} aria-hidden="true" />
                                        </span>
                                    </div>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
