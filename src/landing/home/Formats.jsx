import { Tent, Mic2, Disc3, Store, Camera, GraduationCap } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';

const FORMATS = [
    { icon: Tent, title: 'Fest takeovers', text: 'Stages, stalls and moments across a college fest.', span: 'md:col-span-2 md:row-span-2', bg: 'from-emerald-500/70 via-emerald-900/50 to-black', big: true },
    { icon: Mic2, title: 'Artist nights', text: 'Concerts and live sets, from booking to the encore.', span: '', bg: 'from-fuchsia-500/70 via-purple-900/50 to-black' },
    { icon: Disc3, title: 'Club and college nights', text: 'Themed nights with guestlists and QR entry.', span: '', bg: 'from-cyan-400/70 via-sky-900/50 to-black' },
    { icon: Store, title: 'Brand pop-ups', text: 'Launches and pop-ups people queue for.', span: '', bg: 'from-amber-400/70 via-orange-900/50 to-black' },
    { icon: Camera, title: 'Creator meetups', text: 'Creators at your venue, posting as it happens.', span: '', bg: 'from-rose-500/70 via-rose-900/50 to-black' },
    { icon: GraduationCap, title: 'Campus creator drives', text: 'Student creators sharing your brand on their campus.', span: 'col-span-2 md:col-span-4', bg: 'from-lime-400/70 via-green-900/50 to-black' },
];

// What a Newbi project can look like, as a bento grid of formats.
export default function Formats() {
    return (
        <section aria-labelledby="formats-title" className="py-20 md:py-28 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    id="formats-title"
                    eyebrow="Formats"
                    title="Experiences we"
                    highlight="create."
                    text="Every brief is different, but most of what we run starts from one of these."
                    align="center"
                />
                <ul className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-4 md:auto-rows-[200px] gap-3 md:gap-4">
                    {FORMATS.map((f) => (
                        <li key={f.title} className={`nb-pop group relative overflow-hidden rounded-[1.75rem] bg-gray-950 border border-white/[0.08] p-5 md:p-6 flex flex-col justify-end min-h-[180px] ${f.span} ${f.big ? 'col-span-2' : ''}`}>
                            <div aria-hidden="true" className={`nb-tile-bg absolute inset-0 bg-gradient-to-br ${f.bg} opacity-90 group-hover:opacity-100 transition-opacity`} />
                            <f.icon aria-hidden="true" className={`absolute text-white/15 group-hover:text-neon-green/40 group-hover:scale-110 group-hover:-rotate-6 transition duration-500 ${f.big ? 'right-6 top-6 w-28 h-28 md:w-40 md:h-40' : 'right-4 top-4 w-14 h-14 md:w-16 md:h-16'}`} />
                            <div className="relative">
                                <h3 className={`font-heading font-extrabold text-white ${f.big ? 'text-2xl md:text-4xl' : 'text-lg md:text-xl'}`}>{f.title}</h3>
                                <p className={`mt-1.5 text-white/70 leading-snug ${f.big ? 'text-sm md:text-base max-w-sm' : 'text-[13px]'}`}>{f.text}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
