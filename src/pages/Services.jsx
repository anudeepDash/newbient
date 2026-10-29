import React from 'react';
import LegalDoc, { P, UL, Rows, A } from './legal/LegalDoc';

/*
 * newbi.live/services: what Newbi sells and how it is priced, on one page with no sign-in and no
 * redirects. Payment gateways review this page, so every offering is listed with how it is priced,
 * how it is delivered and where to ask about it. Put real amounts in PRICE; the rest follows.
 */

const UPDATED = '29 October 2026';
const SUPPORT = <A href="mailto:support@newbi.live">support@newbi.live</A>;

const QUOTE = 'Quoted per project, in INR, after a short brief';
const PRICE = {
    tickets: 'Shown on each event page before you book, in INR',
    activation: QUOTE,
    events: QUOTE,
    campaigns: QUOTE,
    campus: QUOTE,
    pr: QUOTE,
};

const sections = [
    {
        id: 'what-we-offer',
        title: 'What we offer',
        body: (
            <>
                <P>
                    Newbi Entertainment &amp; Marketing LLP plans, produces and runs live events, college and campus programmes, brand
                    activations and creator campaigns across India. Everything below is a service we deliver; we do not sell physical goods.
                </P>
                <Rows rows={[
                    ['Event tickets and passes', 'Entry to concerts, college fests and community shows that Newbi produces. A ticket is a digital QR pass sent to your phone and email after your booking is confirmed.'],
                    ['Live event production', 'Concept, artist booking, stage, sound, lighting, ticketing and on-ground crew for concerts and shows, planned and run end to end.'],
                    ['Brand activations', 'On-ground and on-campus brand experiences: sampling, pop-ups, launches and fan zones, with reporting after the event.'],
                    ['Creator campaigns', 'Influencer and creator marketing for brands: briefs, creator matching by city and niche, content approvals and a delivery report.'],
                    ['Campus programmes', 'Fests, workshops and brand programmes run with colleges across India.'],
                    ['PR and promotion', 'Press, social and launch support for shows, artists and brands.'],
                ]} />
            </>
        ),
    },
    {
        id: 'pricing',
        title: 'Pricing',
        body: (
            <>
                <P>All prices are in Indian Rupees (INR). Taxes, where they apply, are shown before you pay.</P>
                <Rows rows={[
                    ['Event tickets and passes', PRICE.tickets],
                    ['Live event production', PRICE.events],
                    ['Brand activations', PRICE.activation],
                    ['Creator campaigns', PRICE.campaigns],
                    ['Campus programmes', PRICE.campus],
                    ['PR and promotion', PRICE.pr],
                ]} />
                <P>
                    For project work we share a written proposal with the scope, timeline and amount. Work begins once you accept it and
                    the agreed advance is received.
                </P>
            </>
        ),
    },
    {
        id: 'how-to-buy',
        title: 'How to book or enquire',
        body: (
            <UL items={[
                <>Tickets: open the event page, choose the pass, pay, and your QR pass is issued once the payment is confirmed.</>,
                <>Project work: send a short brief from the <A href="/contact">contact page</A>. We reply by email within a working day with a proposal.</>,
                <>Questions about a booking: write to {SUPPORT}.</>,
            ]} />
        ),
    },
    {
        id: 'delivery',
        title: 'Delivery',
        body: (
            <UL items={[
                'Tickets and passes are delivered digitally, by email and in your Newbi account, usually within a few minutes of the payment being confirmed.',
                'Project work is delivered on the dates in the accepted proposal, with updates from the team along the way.',
                'Nothing is shipped, so there are no shipping charges.',
            ]} />
        ),
    },
    {
        id: 'policies',
        title: 'Policies and contact',
        body: (
            <UL items={[
                <>Cancellation and refunds: see our <A href="/refund-policy">Cancellation &amp; Refund Policy</A>.</>,
                <>How we use your details: <A href="/privacy">Privacy Policy</A>. The rules for using Newbi: <A href="/terms">Terms of Service</A>.</>,
                <>Reach the team on the <A href="/contact">contact page</A> or at {SUPPORT}.</>,
            ]} />
        ),
    },
];

const Services = () => (
    <LegalDoc
        eyebrow="Services"
        title="What we"
        highlight="offer."
        updated={UPDATED}
        intro={<p>Event tickets, live production, brand activations, creator campaigns and campus programmes from Newbi, with how each is priced and delivered.</p>}
        sections={sections}
    />
);

export default Services;
