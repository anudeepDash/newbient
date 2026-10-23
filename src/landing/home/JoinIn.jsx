import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { APP_LINKS } from '../links';
import { useT } from '../../i18n';

function Column({ label, title, intro, points, cta, more, dark, welcome }) {
    const t = useT();
    const Arrow = ArrowUpRight;
    const pts = welcome ? welcome.toLocaleString('en-IN') : '';
    const btn = `mt-10 inline-flex h-14 px-8 items-center gap-2 rounded-full font-heading font-bold text-base transition hover:scale-[1.03] active:scale-[0.98] ${dark ? 'bg-neon-green text-black' : 'bg-gray-950 text-white dark:bg-white dark:text-black'}`;
    return (
        <div className={`nb-reveal relative overflow-hidden flex flex-col p-7 sm:p-10 lg:p-14 rounded-[2rem] ${dark ? '[--nb-ghost:rgba(255,255,255,0.42)] bg-gray-950 text-white dark:bg-[#0a0a0a] dark:border dark:border-white/10' : 'bg-white/60 dark:bg-white/[0.03] border border-gray-950/10 dark:border-white/10 text-gray-950 dark:text-white'}`}>
            {dark && <div aria-hidden="true" className="absolute -top-40 -right-40 w-[34rem] h-[34rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(57,255,20,0.22), transparent)' }} />}
            <p className={`relative font-mono text-[11px] font-bold uppercase tracking-[0.28em] ${dark ? 'text-neon-green' : 'text-gray-500 dark:text-zinc-500'}`}>{t(label)}</p>
            <h3 className="relative mt-5 font-heading font-extrabold tracking-[-0.035em] leading-[0.95] text-4xl md:text-5xl lg:text-6xl">{t(title)}</h3>
            <p className={`relative mt-5 max-w-md text-base md:text-lg leading-relaxed ${dark ? 'text-zinc-300' : 'text-gray-600 dark:text-zinc-400'}`}>{t(intro)}</p>
            <ul className="relative mt-7 space-y-3 max-w-md">
                {points.map((p) => (
                    <li key={p} className={`flex items-start gap-3 text-[15px] md:text-base ${dark ? 'text-zinc-200' : 'text-gray-700 dark:text-zinc-300'}`}>
                        <span aria-hidden="true" className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${dark ? 'bg-neon-green text-black' : 'bg-gray-950 text-white dark:bg-neon-green dark:text-black'}`}><Check size={12} strokeWidth={3} /></span>{t(p, { points: pts })}
                    </li>
                ))}
            </ul>
            <div className="relative mt-auto flex flex-wrap items-center gap-x-6 gap-y-3">
                <a href={cta.href} className={btn}>{t(cta.label)} <Arrow size={18} aria-hidden="true" /></a>
                <Link to={more.to} className={`mt-10 inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold underline underline-offset-4 decoration-neon-green ${dark ? 'text-white' : 'text-gray-950 dark:text-white'}`}>{t(more.label)} <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
        </div>
    );
}

/*
 * The first thing on the home page after the hero: the platform creators and
 * the community use. Creators apply once and work every campaign from one dashboard; the
 * community joins guestlists, gigs and giveaways with one account.
 */
export default function JoinIn({ welcomePoints }) {
    return (
        <section id="community" aria-labelledby="join-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                <SectionHeading
                    id="join-title"
                    index="01"
                    eyebrow="Creators & community"
                    title="Be part of"
                    highlight="the night."
                    text="Every show and campaign we run lives on newbi.live for the people in it. Creators get a dashboard. The community gets guestlists, passes and giveaways. One account, no forms to fill twice."
                />
                <div className="mt-12 md:mt-16 grid gap-4 md:gap-6 lg:grid-cols-2">
                    <Column
                        label="For creators"
                        title="Apply once. Work every campaign from one dashboard."
                        intro="Join the Newbi creator network and we match you to brand campaigns by city, niche and audience."
                        points={[
                            'Briefs, deliverables and approvals in one place',
                            'Access to concerts, fests and live events',
                            'Tickets and passes for campaigns you are on',
                            welcomePoints ? '{points} Newbi points the day you join' : 'Free to join',
                        ]}
                        cta={{ label: 'Apply as a creator', href: APP_LINKS.creatorApply }}
                        more={{ label: 'How the network works', to: '/creator' }}
                        welcome={welcomePoints}
                        dark
                    />
                    <Column
                        label="For the community"
                        title="Be on the list for every show near you."
                        intro="Students and fans sign in once to join guestlists, volunteer at gigs and enter giveaways. Your passes live in your account, with a QR code at the gate."
                        points={[
                            'Guestlists for shows in your city',
                            'Volunteer gigs at live events',
                            'Giveaways, passes and a QR code for entry',
                        ]}
                        cta={{ label: 'Join the community', href: APP_LINKS.community }}
                        more={{ label: 'How the community works', to: '/community' }}
                    />
                </div>
            </div>
        </section>
    );
}
