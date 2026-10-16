import { useEffect, useState } from 'react';
import Hero from '../home/Hero';
import Proof from '../home/Proof';
import Showreel from '../home/Showreel';
import Services from '../home/Services';
import CaseStudies from '../home/CaseStudies';
import JoinIn from '../home/JoinIn';
import Upcoming from '../home/Upcoming';
import EnquiryForm from '../components/EnquiryForm';
import { usePublicFeed, isOff } from '../feed';
import { APP_LINKS } from '../links';

// Old share links on "/" (?event=, ?gl=, ?gig=, ?form=, ?campaign=) now live in the app.
function useLegacyQueryRedirect() {
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const go = (url) => window.location.replace(url);
        if (p.get('event')) go(APP_LINKS.event(p.get('event')));
        else if (p.get('gl')) go(APP_LINKS.event(p.get('gl')));
        else if (p.get('campaign')) go(APP_LINKS.campaign(p.get('campaign')));
        else if (p.get('gig')) go(`/community?gig=${encodeURIComponent(p.get('gig'))}`);
        else if (p.get('form')) go(`/forms/${encodeURIComponent(p.get('form'))}`);
    }, []);
}

export default function HomePage() {
    useLegacyQueryRedirect();
    const feed = usePublicFeed();
    const [audience, setAudience] = useState('');
    const off = (section) => isOff(feed, { section });

    return (
        <div>
            <Hero onChooseAudience={setAudience} images={feed?.heroImages} />
            {!off('home_portfolio') && <Showreel images={feed?.heroImages} />}
            {!off('home_clients') && <Proof clients={feed?.clients} stats={feed?.settings?.stats} />}
            <Services />
            {!off('home_portfolio') && <CaseStudies items={feed?.caseStudies} />}
            {!off('home_creators') && <JoinIn welcomePoints={feed?.settings?.creatorWelcomePoints} />}
            {!off('home_upcoming') && <Upcoming events={feed?.events} />}

            <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-20 py-16 md:py-24 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
                    <div className="nb-reveal max-w-md">
                        <h2 id="enquire-title" className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-950 dark:text-white">Tell us what you're planning</h2>
                        <p className="mt-4 text-base md:text-lg text-gray-600 dark:text-zinc-400 leading-relaxed">
                            A campus activation, a show, a creator campaign, or something in between. Share a few details and the team will get back to you by email.
                        </p>
                    </div>
                    <EnquiryForm audience={audience} onAudienceChange={setAudience} page="home" />
                </div>
            </section>
        </div>
    );
}
