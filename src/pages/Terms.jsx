import React from 'react';
import LegalDoc, { P, UL, H3, A } from './legal/LegalDoc';

/*
 * newbi.live/terms. Keep it in step with how the product works (manual UPI
 * checkout with a UTR, creator campaigns and payouts, guestlists, giveaways),
 * and update UPDATED with every change.
 */

const UPDATED = '21 October 2026';
const LEGAL = <A href="mailto:legal@newbi.live">legal@newbi.live</A>;
const SUPPORT = <A href="mailto:support@newbi.live">support@newbi.live</A>;

const sections = [
    {
        id: 'agreement',
        title: 'About these terms',
        body: (
            <>
                <P>
                    These terms are an agreement between you and <strong>Newbi Entertainment &amp; Marketing LLP</strong> (“Newbi”,
                    “we”, “us”). They apply when you use newbi.live, the Newbi app at app.newbi.live, our WhatsApp number, and the
                    ticketing, guestlist, creator and community services we run through them (together, “Newbi”).
                </P>
                <P>
                    By creating an account or using Newbi you accept these terms and our <A href="/privacy">Privacy Policy</A>. Some
                    listings (an event, a campaign, a giveaway) have their own rules on their page; those apply too, and win if they
                    conflict with these terms on that listing.
                </P>
            </>
        ),
    },
    {
        id: 'accounts',
        title: 'Your account',
        body: (
            <UL items={[
                'You need to be 18 or older to create an account, or have your parent or guardian’s consent. Some shows and all creator campaigns are 18+ only.',
                'Sign in with Google, email and password, or your phone number. Some features (guestlists, tickets, creator applications) need a verified phone number, which we confirm with a one-time code on WhatsApp or by SMS.',
                'One person, one account. If we find two accounts that share a phone number or email, we can merge them. Using someone else’s number or a temporary number to get around limits isn’t allowed.',
                'Keep your details accurate and your sign-in to yourself. You’re responsible for what happens on your account; tell us at once at support@newbi.live if you think someone else is using it.',
            ]} />
        ),
    },
    {
        id: 'tickets',
        title: 'Tickets, passes and guestlists',
        body: (
            <>
                <H3>Buying tickets</H3>
                <UL items={[
                    'Prices are shown in Indian rupees before you pay and include any fee we charge, unless the listing says otherwise.',
                    'You pay by UPI from your own app, then enter the UPI transaction reference (UTR). Your booking stays pending until our team matches the UTR to the payment, then your passes appear in your account.',
                    'Each UTR can be used once. A false, reused or someone else’s UTR is fraud: we cancel the booking without a refund and may close the account.',
                    'If an event uses an outside payment page, that provider’s terms apply to the payment itself.',
                ]} />
                <H3>Passes and entry</H3>
                <UL items={[
                    'Each pass has its own QR code and admits the number of people shown on it, once. Don’t share or resell it; a copied pass that has already been scanned won’t work.',
                    'Guestlist spots are free unless the listing says otherwise, are limited, and can close early. Being on a guestlist doesn’t guarantee entry after the door time on the pass.',
                    'The organiser and the venue set entry rules, such as age limits, ID, dress code and security checks, and can refuse entry to anyone who doesn’t meet them or puts others at risk. We follow their decision at the door.',
                ]} />
            </>
        ),
    },
    {
        id: 'refunds',
        title: 'Cancellations and refunds',
        body: (
            <UL items={[
                'Tickets can’t be cancelled or refunded once confirmed, unless the listing says otherwise.',
                'If an event is cancelled, you get a full refund of what you paid for it. If it’s postponed or moved, your ticket stays valid for the new date or venue; if you can’t make it, you can ask for a refund within 7 days of the announcement.',
                'Refunds go back by UPI to the account you paid from, usually within 5 to 7 working days after we confirm them.',
                'No refund is due if you’re refused entry for breaking the organiser’s or venue’s rules, or if you don’t turn up.',
            ]} />
        ),
    },
    {
        id: 'creators',
        title: 'Creator campaigns',
        body: (
            <>
                <H3>Applying and taking part</H3>
                <UL items={[
                    'Creator profiles and campaign applications are free. We review them and may approve, shortlist or decline them at our discretion; applying doesn’t guarantee a place.',
                    'Your Instagram (or other) account must be yours, real and active. Bought followers, fake engagement or someone else’s account will get the application or profile removed.',
                    'Once shortlisted, follow the campaign brief: the content, dates, tags and brand guidelines it sets. Join the campaign group when asked; that’s where the brief and updates are shared.',
                ]} />
                <H3>Your content</H3>
                <UL items={[
                    'You keep ownership of what you create. You give Newbi and the campaign’s brand a non-exclusive, royalty-free licence to share, repost and use your campaign posts, credited to you, on their channels for the purpose of that campaign, unless the brief says otherwise.',
                    'Your posts must be your own work, follow Instagram’s rules and the law, and be clearly marked as paid or gifted (for example “#ad” or Instagram’s paid-partnership label), as the Advertising Standards Council of India (ASCI) requires.',
                ]} />
                <H3>Rewards and payouts</H3>
                <UL items={[
                    'Each campaign says what it offers (cash, a pass, products or a mix), which can depend on your follower tier at the time you apply.',
                    'Cash is paid by UPI to the UPI ID you give us, after your posts are live and approved, unless we agree otherwise in writing. We can hold or cancel a payout if the posts don’t meet the brief, are taken down early, or break these terms.',
                    'You’re responsible for any income tax on what you receive. Where the law requires us to deduct tax at source, we will, and we’ll share the details.',
                ]} />
            </>
        ),
    },
    {
        id: 'community',
        title: 'Giveaways, gigs and referrals',
        body: (
            <UL items={[
                'Each giveaway sets its own entry tasks, end date and prize on its page. Winners are picked as the page describes, and the winner’s name may be shown on it. Prizes can’t be swapped for cash.',
                'Volunteer gigs list what they involve and what you get. If you’re picked, turn up on time, follow the crew lead, and treat guests and other volunteers with respect.',
                'Referral points and leaderboards are for real people you bring in. Fake or duplicate accounts, bots or self-referrals get the points removed and can disqualify you.',
            ]} />
        ),
    },
    {
        id: 'messages',
        title: 'Messages from us',
        body: (
            <P>
                By using Newbi you agree that we can send you messages about what you signed up for, such as codes, tickets,
                passes, applications and payouts, by email, WhatsApp, push notification and in the app. Creator campaign updates on
                WhatsApp only go to people who opted in; reply STOP to end them. Marketing emails have an unsubscribe link. See
                the <A href="/privacy">Privacy Policy</A> for details.
            </P>
        ),
    },
    {
        id: 'acceptable-use',
        title: 'What’s not allowed',
        body: (
            <UL items={[
                'Breaking the law, or using Newbi to harass, threaten or impersonate anyone.',
                'Reselling passes or tickets, or selling access to guestlists, campaigns or giveaways.',
                'Faking payments, UTRs, follower counts, engagement or referrals.',
                'Scraping Newbi, overloading it, probing it for security holes, or getting around its limits or verification.',
                'Uploading content that is illegal, hateful, sexually explicit, violent, or that you don’t have the rights to.',
            ]} />
        ),
    },
    {
        id: 'ip',
        title: 'Our content and brand',
        body: (
            <P>
                The Newbi name, logos, designs, text, graphics and software are ours or licensed to us. You can share links to our
                pages and listings, but you can’t copy, change or reuse our content or brand without our written permission. Event,
                artist and brand names and artwork belong to their owners.
            </P>
        ),
    },
    {
        id: 'third-parties',
        title: 'Other services',
        body: (
            <P>
                Newbi works with services run by others, such as Google sign-in, Instagram, WhatsApp, UPI apps and outside
                payment pages. Their terms apply when you use them, and we aren’t responsible for how they work or for content on
                sites we link to. Events are run with organisers, artists, venues and brands; where an event is run by someone
                else, they are responsible for the event itself.
            </P>
        ),
    },
    {
        id: 'liability',
        title: 'Our responsibility to you',
        body: (
            <>
                <P>
                    We work to keep listings accurate and Newbi running, but event details (line-ups, timings, venues) can change,
                    and we provide Newbi “as is”. We aren’t responsible for losses we couldn’t reasonably foresee, or for anything
                    caused by events outside our control, such as weather, government orders, strikes, outages or an artist
                    cancelling.
                </P>
                <P>
                    As far as the law allows, our total responsibility to you for any claim is limited to what you paid us for the
                    ticket or service the claim is about. Nothing in these terms limits your rights as a consumer under Indian law,
                    or our responsibility where the law doesn’t allow it to be limited.
                </P>
            </>
        ),
    },
    {
        id: 'suspension',
        title: 'Suspending or closing accounts',
        body: (
            <P>
                We can suspend or close an account, cancel bookings or remove content if these terms are broken, if we suspect fraud,
                or if the law requires it. Where we reasonably can, we’ll tell you why and give you a chance to respond. You can
                close your account at any time; see <A href="/privacy#delete-your-data">Delete your data</A>.
            </P>
        ),
    },
    {
        id: 'changes',
        title: 'Changes to these terms',
        body: (
            <P>
                We may update these terms as Newbi changes. We’ll update the date at the top, and tell you by email or in the app
                before important changes apply. If you keep using Newbi after that, the new terms apply; if you don’t agree, you can
                close your account.
            </P>
        ),
    },
    {
        id: 'law',
        title: 'Law and disputes',
        body: (
            <P>
                These terms are governed by the laws of India. If something goes wrong, write to us first at {SUPPORT} and we’ll try
                to sort it out within 30 days. If we can’t, the courts at New Delhi have jurisdiction, without affecting your right to
                approach a consumer commission.
            </P>
        ),
    },
    {
        id: 'contact',
        title: 'Contact',
        body: (
            <P>
                Questions about these terms: {LEGAL}. Help with a booking, pass or campaign: {SUPPORT}.
            </P>
        ),
    },
];

const Terms = () => (
    <LegalDoc
        eyebrow="Terms"
        title="Terms of"
        highlight="service."
        updated={UPDATED}
        intro={<p>The rules for using Newbi: your account, tickets and passes, refunds, creator campaigns and payouts, giveaways and gigs, and what happens when something goes wrong.</p>}
        sections={sections}
    />
);

export default Terms;
