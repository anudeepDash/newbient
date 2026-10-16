import { useEffect, useState } from 'react';
import { Mail, Phone, MessageSquare, CalendarCheck, FileText } from 'lucide-react';
import Hero from '../home/Hero';
import Proof from '../home/Proof';
import Services from '../home/Services';
import CaseStudies from '../home/CaseStudies';
import JoinIn from '../home/JoinIn';
import Upcoming from '../home/Upcoming';
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

const NEXT = [
    { icon: MessageSquare, title: 'We reply by email', text: 'Someone from the team reads every enquiry and writes back.' },
    { icon: CalendarCheck, title: 'A short call', text: 'We talk through the goal, the audience, the dates and the budget.' },
    { icon: FileText, title: 'A plan and a quote', text: 'You get a clear plan, a timeline and what it will cost.' },
];

export default function HomePage() {
    useLegacyQueryRedirect();
    const feed = usePublicFeed();
    const [audience, setAudience] = useState('');
    const off = (section) => isOff(feed, { section });
    const contact = feed?.contact || {};

    return (
        <div>
            <Hero onChooseAudience={setAudience} />
            {!off('home_clients') && <Proof clients={feed?.clients} stats={feed?.settings?.stats} />}
            <Services />
            {!off('home_portfolio') && <CaseStudies items={feed?.caseStudies} />}
            {!off('home_creators') && <JoinIn welcomePoints={feed?.settings?.creatorWelcomePoints} />}
            {!off('home_upcoming') && <Upcoming events={feed?.events} />}

            <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-20 py-20 md:py-28 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:gap-16 lg:grid-cols-[0.9fr_1.3fr]">
                    <div>
                        <SectionHeading
                            id="enquire-title"
                            eyebrow="Work with us"
                            title="Let's build something"
                            highlight="remarkable."
                            text="A campus activation, a show, a creator campaign or something in between. Tell us what you have in mind."
                        />
                        <ol className="nb-reveal mt-10 space-y-6">
                            {NEXT.map((n, i) => (
                                <li key={n.title} className="flex gap-4">
                                    <span className="w-11 h-11 shrink-0 rounded-2xl bg-gray-950 text-neon-green dark:bg-white/[0.06] flex items-center justify-center">
                                        <n.icon size={19} aria-hidden="true" />
                                    </span>
                                    <span>
                                        <span className="block text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-zinc-500">Step 0{i + 1}</span>
                                        <span className="block mt-0.5 font-heading text-lg font-extrabold text-gray-950 dark:text-white">{n.title}</span>
                                        <span className="block mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{n.text}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                        {(contact.email || contact.phone) && (
                            <div className="nb-reveal mt-10 pt-8 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1">
                                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-zinc-500 mb-2">Or reach us directly</p>
                                {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 min-h-[44px] font-semibold text-gray-950 dark:text-white hover:text-emerald-600 dark:hover:text-neon-green">
                                        <Mail size={17} aria-hidden="true" /> {contact.email}
                                    </a>
                                )}
                                {contact.phone && (
                                    <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-2.5 min-h-[44px] font-semibold text-gray-950 dark:text-white hover:text-emerald-600 dark:hover:text-neon-green">
                                        <Phone size={17} aria-hidden="true" /> {contact.phone}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                    <EnquiryForm audience={audience} onAudienceChange={setAudience} page="home" />
                </div>
            </section>
        </div>
    );
}
