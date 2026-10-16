import { GraduationCap, Workflow, Users, QrCode } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';

const PILLARS = [
    { icon: GraduationCap, title: 'Campus-native', text: 'We work inside college fests and live shows, so we know how campuses, crowds and permissions really work.' },
    { icon: Workflow, title: 'One crew, end to end', text: 'Idea, artists, production, creators and reporting under one roof. One point of contact and no hand-offs between agencies.' },
    { icon: Users, title: 'Creators on tap', text: 'Our own creator network, matched by city and niche, so campaigns start with people who already know how we brief.' },
    { icon: QrCode, title: 'Our own tech', text: 'Ticketing, QR entry, guestlists and a creator dashboard we built ourselves, so you can see what is happening as it happens.' },
];

export default function WhyNewbi() {
    return (
        <section aria-labelledby="why-title" className="relative py-20 md:py-28 border-t border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(50% 60% at 100% 50%, rgba(57,255,20,0.07), transparent 70%)' }} />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <SectionHeading
                    id="why-title"
                    eyebrow="Why Newbi"
                    title="Big nights need"
                    highlight="one crew."
                    text="Brands and colleges come to us because the whole thing is handled by people who have done it before, and who stay with it until the last report is in."
                />
                <ul className="grid gap-4 sm:grid-cols-2">
                    {PILLARS.map((p) => (
                        <li key={p.title} className={`nb-pop group p-6 rounded-[1.75rem] bg-white dark:bg-[#0b0e14] border border-black/[0.07] dark:border-white/[0.07] hover:-translate-y-1 hover:border-black/20 dark:hover:border-neon-green/40 transition`}>
                            <span className="w-12 h-12 rounded-2xl bg-neon-green/15 text-gray-950 dark:text-neon-green flex items-center justify-center group-hover:rotate-[-8deg] group-hover:scale-110 transition-transform">
                                <p.icon size={22} aria-hidden="true" />
                            </span>
                            <h3 className="mt-5 font-heading text-xl font-extrabold text-gray-950 dark:text-white">{p.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{p.text}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
