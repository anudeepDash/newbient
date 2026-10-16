import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { APP_LINKS } from '../links';

function Points({ items, tone }) {
    return (
        <ul className="mt-6 space-y-3">
            {items.map((t) => (
                <li key={t} className={`flex items-start gap-3 text-[15px] ${tone === 'dark' ? 'text-zinc-200' : 'text-gray-700 dark:text-zinc-300'}`}>
                    <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${tone === 'dark' ? 'bg-neon-green text-black' : 'bg-gray-950 text-white dark:bg-neon-green dark:text-black'}`}>
                        <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                    {t}
                </li>
            ))}
        </ul>
    );
}

// The pitch to creators and to students and fans: what they get, then one clear next step.
export default function JoinIn({ welcomePoints }) {
    const creatorPoints = [
        'Brand campaigns matched to your city and niche',
        'Access to concerts, fests and live events',
        'One profile and one dashboard for every campaign',
        welcomePoints ? `${welcomePoints.toLocaleString('en-IN')} Newbi points when you join` : 'Free to join',
    ];
    return (
        <section aria-labelledby="join-title" className="py-20 md:py-28 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    id="join-title"
                    eyebrow="Community"
                    title="Built for the people"
                    highlight="who show up."
                    text="Newbi isn't only for brands. Creators and students are the ones who make every show and campaign work, and there's a place for both."
                />
                <div className="mt-12 md:mt-14 grid gap-4 md:gap-5 lg:grid-cols-2">
                    <div className="nb-reveal relative overflow-hidden flex flex-col p-7 sm:p-10 rounded-[2rem] bg-gray-950 text-white border border-neon-green/25">
                        <div aria-hidden="true" className="absolute -top-28 -right-28 w-72 h-72 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(57,255,20,0.22), transparent)' }} />
                        <p className="relative text-[11px] font-black uppercase tracking-[0.3em] text-neon-green">For creators</p>
                        <h3 className="relative mt-4 font-heading text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">Get paid to create with brands you like.</h3>
                        <div className="relative"><Points items={creatorPoints} tone="dark" /></div>
                        <Link to="/creator" className="relative mt-9 self-start h-12 px-6 inline-flex items-center gap-2 rounded-xl bg-neon-green text-black font-bold hover:brightness-95 transition">
                            Explore the creator program <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="nb-reveal flex flex-col p-7 sm:p-10 rounded-[2rem] bg-white dark:bg-[#0b0e14] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-zinc-400">For students and fans</p>
                        <h3 className="mt-4 font-heading text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-gray-950 dark:text-white">Be on the list for what's next.</h3>
                        <Points items={['Guestlists for shows in your city', 'Volunteer gigs at live events', 'Giveaways and passes, all in one app']} />
                        <a href={APP_LINKS.home} className="mt-9 self-start h-12 px-6 inline-flex items-center gap-2 rounded-xl bg-gray-950 text-white dark:bg-white dark:text-black font-bold hover:opacity-90 transition-opacity">
                            Open the Newbi app <ArrowUpRight size={17} aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
