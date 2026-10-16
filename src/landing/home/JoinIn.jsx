import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { APP_LINKS } from '../links';

function Panel({ index, word, lead, points, cta, dark }) {
    const Arrow = cta.href ? ArrowUpRight : ArrowRight;
    const btn = `mt-10 inline-flex h-14 px-8 items-center gap-2 rounded-full font-heading font-extrabold uppercase tracking-[0.06em] text-base transition hover:scale-[1.03] active:scale-[0.98] ${dark ? 'bg-neon-green text-black' : 'bg-gray-950 text-white dark:bg-white dark:text-black'}`;
    return (
        <div className={`nb-reveal group relative overflow-hidden flex flex-col p-7 sm:p-10 lg:p-14 min-h-[520px] ${dark ? '[--nb-stroke:#fff] bg-gray-950 text-white dark:bg-[#0a0a0a]' : 'bg-white/60 dark:bg-white/[0.03] text-gray-950 dark:text-white'}`}>
            {dark && <div aria-hidden="true" className="absolute -top-40 -right-40 w-[34rem] h-[34rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(57,255,20,0.22), transparent)' }} />}
            <p className={`relative font-mono text-[11px] font-bold uppercase tracking-[0.28em] ${dark ? 'text-zinc-500' : 'text-gray-500 dark:text-zinc-500'}`}><span className="text-neon-green">{index}</span> — {lead}</p>
            <h3 className="relative mt-6 font-heading font-black uppercase tracking-[-0.04em] leading-[0.86] text-[20vw] sm:text-[14vw] lg:text-[8.5vw]">
                <span className="nb-outline group-hover:text-current transition-colors duration-500">{word}</span>
            </h3>
            <ul className="relative mt-8 space-y-3 max-w-md">
                {points.map((p) => (
                    <li key={p} className={`flex items-start gap-3 text-base md:text-lg ${dark ? 'text-zinc-300' : 'text-gray-700 dark:text-zinc-300'}`}>
                        <span aria-hidden="true" className="mt-2.5 w-2 h-2 shrink-0 rounded-full bg-neon-green" />{p}
                    </li>
                ))}
            </ul>
            <div className="relative mt-auto">
                {cta.href
                    ? <a href={cta.href} className={btn}>{cta.label} <Arrow size={18} aria-hidden="true" /></a>
                    : <Link to={cta.to} className={btn}>{cta.label} <Arrow size={18} aria-hidden="true" /></Link>}
            </div>
        </div>
    );
}

// The two halves of the crowd: creators, and the students and fans who show up.
export default function JoinIn({ welcomePoints }) {
    return (
        <section aria-label="For creators, students and fans" className="border-t border-gray-950/10 dark:border-white/10 grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-950/10 dark:divide-white/10">
            <Panel
                index="05"
                lead="For creators"
                word="Creators"
                points={[
                    'Brand campaigns matched to your city and niche',
                    'Access to concerts, fests and live events',
                    'One profile, one dashboard, every campaign',
                    welcomePoints ? `${welcomePoints.toLocaleString('en-IN')} Newbi points the day you join` : 'Free to join',
                ]}
                cta={{ label: 'Join the network', to: '/creator' }}
                dark
            />
            <Panel
                index="05"
                lead="For students & fans"
                word="Fans"
                points={['Guestlists for shows in your city', 'Volunteer gigs at live events', 'Giveaways and passes, all in one app']}
                cta={{ label: 'Open the app', href: APP_LINKS.home }}
            />
        </section>
    );
}
