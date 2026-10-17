import { ArrowUpRight, Instagram, Mail, MapPin, MessageCircle, Sparkles, Ticket, Newspaper } from 'lucide-react';
import EnquiryForm from '../landing/components/EnquiryForm';
import SectionLabel from '../landing/components/SectionLabel';
import Sticker from '../landing/components/Sticker';
import { usePublicFeed } from '../landing/feed';
import { APP_LINKS } from '../landing/links';

/*
 * /contact on the landing site: prerendered, no Firestore. Contact details
 * come from the cached public feed (nothing is shown for a missing one);
 * the form posts to the enquiry handler.
 */

const handleOf = (url) => '@' + (String(url).replace(/\/+$/, '').split('/').pop() || 'newbi.live');

function Direct({ icon: Icon, label, value, href, external }) {
    return (
        <li>
            <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex items-center gap-4 py-4 min-h-[64px]"
            >
                <span className="w-11 h-11 shrink-0 rounded-full bg-white dark:bg-white/[0.06] ring-1 ring-black/[0.07] dark:ring-white/10 flex items-center justify-center text-gray-800 dark:text-zinc-200 group-hover:bg-neon-green group-hover:text-black group-hover:ring-black/20 transition-colors">
                    <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-zinc-500">{label}</span>
                    <span className="block mt-0.5 font-heading text-lg sm:text-xl font-extrabold text-gray-950 dark:text-white break-words">{value}</span>
                </span>
                <ArrowUpRight size={18} className="shrink-0 text-gray-400 group-hover:text-gray-950 dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" aria-hidden="true" />
            </a>
        </li>
    );
}

const OTHER_WAYS = [
    { icon: Sparkles, title: "I'm a creator", text: 'Apply to the Newbi creator network for paid brand campaigns.', href: APP_LINKS.creatorApply },
    { icon: Ticket, title: 'Guestlists and passes', text: 'Your passes, guestlists and giveaways are in the Newbi app.', href: APP_LINKS.community },
    { icon: Newspaper, title: 'A story for ConcertZone', text: 'Pitch an artist, a scene or a night to our music magazine.', href: '/concertzone' },
];

export default function Contact() {
    const feed = usePublicFeed();
    const c = feed?.contact || {};
    const phoneDigits = (c.phone || '').replace(/[^0-9]/g, '');

    const direct = [
        c.email && { icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
        phoneDigits && { icon: MessageCircle, label: 'WhatsApp', value: c.phone, href: `https://wa.me/${phoneDigits}`, external: true },
        c.instagram && { icon: Instagram, label: 'Instagram', value: handleOf(c.instagram), href: c.instagram, external: true },
        c.address && { icon: MapPin, label: 'Office', value: c.address, href: `https://maps.google.com/?q=${encodeURIComponent(c.address)}`, external: true },
    ].filter(Boolean);

    return (
        <div className="overflow-x-clip">
            <section className="relative">
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(55% 60% at 85% 0%, rgba(57,255,20,0.16), transparent 70%)' }} />
                <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 md:pt-24 pb-10 md:pb-14">
                    <SectionLabel>Contact</SectionLabel>
                    <h1 className="mt-5 max-w-5xl font-heading font-extrabold tracking-[-0.045em] leading-[0.92] text-[3rem] sm:text-7xl lg:text-[6.5rem] text-gray-950 dark:text-white">
                        Tell us what you're <Sticker subtle>planning.</Sticker>
                    </h1>
                    <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-gray-600 dark:text-zinc-400">
                        A college activation, a live show or a creator campaign. Write to us here and the team replies by email within a working day.
                    </p>
                </div>
            </section>

            <section aria-label="Get in touch" className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-24 md:pb-32 grid gap-12 lg:gap-16 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="order-2 lg:order-1 lg:sticky lg:top-28 self-start space-y-12">
                    <div>
                        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">Or reach us directly</p>
                        {feed === null ? (
                            <ul aria-hidden="true" className="mt-2 divide-y divide-gray-950/10 dark:divide-white/10">
                                {[0, 1, 2].map((i) => (
                                    <li key={i} className="flex items-center gap-4 py-4">
                                        <span className="w-11 h-11 rounded-full bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                                        <span className="h-5 w-48 rounded-md bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                                    </li>
                                ))}
                            </ul>
                        ) : direct.length > 0 ? (
                            <ul className="mt-2 divide-y divide-gray-950/10 dark:divide-white/10 border-b border-gray-950/10 dark:border-white/10">
                                {direct.map((m) => <Direct key={m.label} {...m} />)}
                            </ul>
                        ) : (
                            <p className="mt-3 text-gray-600 dark:text-zinc-400">Use the form and we'll reply by email.</p>
                        )}
                    </div>

                    <div>
                        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500">Looking for something else?</p>
                        <ul className="mt-4 grid gap-3">
                            {OTHER_WAYS.map(({ icon: Icon, title, text, href }) => (
                                <li key={title}>
                                    <a href={href} className="group flex items-start gap-4 p-4 rounded-2xl bg-white/70 dark:bg-white/[0.03] ring-1 ring-black/[0.06] dark:ring-white/[0.08] hover:ring-black/20 dark:hover:ring-white/25 transition">
                                        <Icon size={20} className="mt-0.5 shrink-0 text-gray-800 dark:text-zinc-200" aria-hidden="true" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-heading font-bold text-gray-950 dark:text-white">{title}</span>
                                            <span className="block mt-0.5 text-sm text-gray-600 dark:text-zinc-400">{text}</span>
                                        </span>
                                        <ArrowUpRight size={18} className="shrink-0 text-gray-400 group-hover:text-gray-950 dark:group-hover:text-white transition-colors" aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="order-1 lg:order-2">
                    <EnquiryForm page="contact" />
                </div>
            </section>
        </div>
    );
}
