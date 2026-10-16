import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import Hero from '../home/Hero';
import Marquee from '../home/Marquee';
import Story from '../home/Story';
import Proof from '../home/Proof';
import Process from '../home/Process';
import Manifesto from '../home/Manifesto';
import CaseStudies from '../home/CaseStudies';
import JoinIn from '../home/JoinIn';
import Upcoming from '../home/Upcoming';
import Faq from '../home/Faq';
import Wordmark from '../home/Wordmark';
import EnquiryForm from '../components/EnquiryForm';
import SectionHeading from '../components/SectionHeading';
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
    const contact = feed?.contact || {};
    const events = off('home_upcoming') ? [] : (feed?.events || []);

    return (
        <div>
            <Hero onChooseAudience={setAudience} nextEvent={events[0]} />
            <Marquee />
            <Story />
            {!off('home_clients') && <Proof clients={feed?.clients} stats={feed?.settings?.stats} />}
            <Process />
            <Manifesto />
            {!off('home_portfolio') && <CaseStudies items={feed?.caseStudies} />}
            {!off('home_creators') && <JoinIn welcomePoints={feed?.settings?.creatorWelcomePoints} />}
            <Upcoming events={events} />
            <Faq />

            <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-20 py-24 md:py-36 border-t border-gray-950/10 dark:border-white/10">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="lg:sticky lg:top-28 self-start">
                        <SectionHeading
                            id="enquire-title"
                            index="08"
                            eyebrow="Work with us"
                            title="Let's make"
                            highlight="noise."
                            text="A fest, a show, a creator campaign or something in between. Tell us what you have in mind and the team replies by email."
                        />
                        {(contact.email || contact.phone) && (
                            <div className="nb-reveal mt-10 space-y-1">
                                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-zinc-500 mb-3">Or reach us directly</p>
                                {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="flex items-center gap-3 min-h-[44px] font-heading text-xl font-extrabold text-gray-950 dark:text-white hover:text-emerald-700 dark:hover:text-neon-green">
                                        <Mail size={18} aria-hidden="true" /> {contact.email}
                                    </a>
                                )}
                                {contact.phone && (
                                    <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-3 min-h-[44px] font-heading text-xl font-extrabold text-gray-950 dark:text-white hover:text-emerald-700 dark:hover:text-neon-green">
                                        <Phone size={18} aria-hidden="true" /> {contact.phone}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="nb-reveal"><EnquiryForm audience={audience} onAudienceChange={setAudience} page="home" /></div>
                </div>
            </section>

            <Wordmark />
        </div>
    );
}
