import { ArrowUpRight } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { APP_LINKS } from '../links';

const parts = (iso) => {
    const d = new Date(`${iso}T00:00:00+05:30`);
    if (Number.isNaN(d.getTime())) return { day: '', mon: '', wd: '' };
    const f = (o) => d.toLocaleDateString('en-IN', { ...o, timeZone: 'Asia/Kolkata' });
    return { day: f({ day: '2-digit' }), mon: f({ month: 'short' }).toUpperCase(), wd: f({ weekday: 'short' }).toUpperCase() };
};

const cta = (e) => (e.isTicketed ? 'Get tickets' : e.hasGuestlist ? 'Get on the list' : 'See event');

// The next three public events, laid out like a tour-date list. Each row opens the event in the app.
export default function Upcoming({ events = [] }) {
    if (!events.length) return null;
    return (
        <section id="upcoming" aria-labelledby="upcoming-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <SectionHeading id="upcoming-title" index="06" eyebrow="Coming up" title="Next on" highlight="stage." />
                    <a href={APP_LINKS.home} className="nb-reveal inline-flex items-center gap-2 min-h-[44px] font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-neon-green">
                        All events in the app <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                </div>
                <ol className="mt-12 border-t border-gray-950/10 dark:border-white/10">
                    {events.map((e) => {
                        const { day, mon, wd } = parts(e.date);
                        return (
                            <li key={e.id} className="nb-reveal border-b border-gray-950/10 dark:border-white/10">
                                <a href={APP_LINKS.event(e.id)} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8 py-6 md:py-8 hover:bg-gray-950/[0.03] dark:hover:bg-white/[0.03] transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
                                    <span className="w-16 md:w-24 text-gray-950 dark:text-white">
                                        <span className="block font-heading font-black text-4xl md:text-6xl leading-none tracking-[-0.04em]">{day}</span>
                                        <span className="block mt-1 font-mono text-[11px] font-bold tracking-[0.2em] text-gray-500 dark:text-zinc-500">{mon} · {wd}</span>
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-heading font-black uppercase tracking-[-0.03em] text-2xl md:text-4xl leading-[0.95] text-gray-950 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-neon-green transition-colors">{e.title}</span>
                                        {(e.location || e.city || e.time) && (
                                            <span className="mt-2 block font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500 truncate">{[e.location, e.city, e.time].filter(Boolean).join(' · ')}</span>
                                        )}
                                    </span>
                                    <span className="inline-flex items-center gap-2 h-11 px-4 md:px-5 rounded-full border border-gray-950/20 dark:border-white/20 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-gray-950 dark:text-white group-hover:bg-neon-green group-hover:text-black group-hover:border-transparent transition-colors">
                                        <span className="hidden sm:inline">{cta(e)}</span><ArrowUpRight size={15} aria-hidden="true" />
                                    </span>
                                </a>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
