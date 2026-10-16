import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { APP_LINKS } from '../links';

// The pitch to creators and students: short, then straight to the right place.
export default function JoinIn({ welcomePoints }) {
    return (
        <section aria-labelledby="join-title" className="py-16 md:py-24 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 id="join-title" className="nb-reveal font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-950 dark:text-white">Creators and students, this part is for you</h2>
                <div className="mt-10 grid gap-4 md:grid-cols-2">
                    <div className="nb-reveal p-6 md:p-10 rounded-3xl bg-gray-950 text-white dark:bg-white/[0.04] dark:border dark:border-white/[0.08] flex flex-col">
                        <p className="text-sm font-semibold text-neon-green">For creators</p>
                        <h3 className="mt-3 font-heading text-2xl md:text-3xl font-bold">Get matched to brand campaigns and live events.</h3>
                        <p className="mt-3 text-zinc-300 leading-relaxed">
                            Apply once, then pick up campaigns that fit your audience and city. Free to join.
                            {welcomePoints ? ` You get ${welcomePoints.toLocaleString('en-IN')} Newbi points when you join.` : ''}
                        </p>
                        <Link to="/creator" className="mt-8 self-start h-12 px-6 inline-flex items-center gap-2 rounded-xl bg-neon-green text-black font-bold hover:brightness-95 transition">
                            See the creator program <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="nb-reveal p-6 md:p-10 rounded-3xl bg-white dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08] flex flex-col">
                        <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">For students and fans</p>
                        <h3 className="mt-3 font-heading text-2xl md:text-3xl font-bold text-gray-950 dark:text-white">Guestlists, passes, gigs and giveaways.</h3>
                        <p className="mt-3 text-gray-600 dark:text-zinc-400 leading-relaxed">
                            Get on the list for shows near you, keep your passes in one place, volunteer at events and enter giveaways, all in the Newbi app.
                        </p>
                        <a href={APP_LINKS.home} className="mt-8 self-start h-12 px-6 inline-flex items-center gap-2 rounded-xl bg-gray-950 text-white dark:bg-white dark:text-black font-bold hover:opacity-90 transition-opacity">
                            Open the app <ArrowUpRight size={17} aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
