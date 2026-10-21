import React from 'react';
import LegalDoc, { P, UL, H3, Rows, A } from './legal/LegalDoc';

/*
 * newbi.live/privacy. Written from what the code does (data collected, the
 * services that process it, how long it's kept, what people can change).
 * When a feature starts collecting something new or uses a new service,
 * update this page and UPDATED. #delete-your-data is the address given to
 * Meta as the app's data-deletion instructions.
 */

const UPDATED = '21 October 2026';
const PRIVACY = <A href="mailto:privacy@newbi.live">privacy@newbi.live</A>;

const sections = [
    {
        id: 'who-we-are',
        title: 'Who we are',
        body: (
            <>
                <P>
                    Newbi is run by <strong>Newbi Entertainment &amp; Marketing LLP</strong> (“Newbi”, “we”, “us”). This policy covers
                    newbi.live, the Newbi app at app.newbi.live, our WhatsApp number and emails, and the creator, ticketing,
                    guestlist and community services we run through them.
                </P>
                <P>
                    We decide why and how your personal data is used, so under India’s Digital Personal Data Protection Act, 2023
                    we are the “data fiduciary” for it. Questions, requests and complaints go to {PRIVACY}.
                </P>
            </>
        ),
    },
    {
        id: 'what-we-collect',
        title: 'What we collect',
        body: (
            <>
                <P>We only collect what a feature needs. What that is depends on what you use:</P>
                <H3>Your account</H3>
                <UL items={[
                    'How you sign in: Google, email and password, or your phone number. For phone sign-in and phone verification we send a one-time code on WhatsApp or by SMS.',
                    'Your profile: name, photo, email, phone number (and whether it’s verified), city, college, whether you’re a student, occupation, gender and interests if you choose to share them, and your notification preferences.',
                    'If two accounts turn out to share a phone number or email, we merge them into one at your request, so one person has one account.',
                ]} />
                <H3>Tickets, passes and guestlists</H3>
                <UL items={[
                    'Your name, email and phone number, what you booked, the amount, any coupon, and the UPI transaction reference (UTR) you enter so we can match your payment.',
                    'Your passes and their QR codes, and for some lists the task you submit (a link, a file or a short answer) and how many guests you bring.',
                ]} />
                <H3>Creators</H3>
                <UL items={[
                    'Your creator profile: name, contact details, city, niches, rates, whether you do barter, bio, college, and your Instagram, YouTube, LinkedIn or X handles.',
                    'Your public Instagram profile details: username, name, follower and post counts, account type and profile picture. See “Instagram” below.',
                    'Campaign applications: the details on the form, your consent to WhatsApp updates (with the time and wording you agreed to), the links and screenshots of the posts you deliver, and your status in each campaign.',
                    'Payouts: your UPI ID and name, and the amount, date and reference of each payout. We also keep these in our accounts.',
                ]} />
                <H3>Giveaways, gigs, forms and messages</H3>
                <UL items={[
                    'Giveaway entries: your name, contact details, city, college, Instagram handle, your answer, tasks and referral points. The top entries’ names and scores, and the winner’s name, are shown on the giveaway page.',
                    'Volunteer gig applications, form responses (whatever the form asks, including uploaded files), newsletter sign-ups, and enquiries you send us through the contact form.',
                    'WhatsApp messages you send to our number, including photos and voice notes. We store the text and keep a reference to media files held by Meta; we don’t keep a copy of the files.',
                ]} />
                <H3>Collected automatically</H3>
                <UL items={[
                    'When you open or click a marketing email or one of our short links, we record that it happened, with the time, your IP address and browser details. Ticket, pass and account emails are not tracked.',
                    'When you sign or view a proposal, agreement or invoice we share with you, we record your IP address as part of the record.',
                    'Push notification tokens for the devices where you turned on notifications.',
                    'Basic technical logs kept by our hosting provider for security and troubleshooting.',
                ]} />
                <P>We don’t use advertising trackers or third-party analytics (no Google Analytics, no Meta Pixel).</P>
            </>
        ),
    },
    {
        id: 'how-we-use-it',
        title: 'How we use it',
        body: (
            <>
                <UL items={[
                    'To run your account, sign you in and verify your phone number.',
                    'To issue and deliver tickets, passes and guestlist entries, check payments against UTRs, and check people in at the door.',
                    'To review creator applications, match creators to campaigns, run those campaigns with brands, review deliverables and pay creators.',
                    'To send you messages about what you signed up for: by email, WhatsApp, push notification and in the app. Marketing emails only go out if you haven’t unsubscribed.',
                    'To prevent fraud and abuse: duplicate accounts, fake payment references, referral manipulation and spam. This includes rate limits on codes and forms.',
                    'To answer your enquiries and support requests, and to keep records we need for accounting, tax and legal reasons.',
                ]} />
                <P>
                    We use your data because you gave consent (for example, when you apply as a creator or opt in to WhatsApp
                    updates), because it’s needed to provide something you asked for, or because the law requires it. You can
                    withdraw consent at any time; see <A href="#your-choices">Your choices</A>.
                </P>
            </>
        ),
    },
    {
        id: 'whatsapp',
        title: 'WhatsApp, email and notifications',
        body: (
            <>
                <P>
                    We send WhatsApp messages from our business number through Meta’s WhatsApp Business Platform: sign-in and
                    verification codes, tickets and passes, and, if you’re a creator who opted in, campaign updates (shortlists,
                    group invites, reminders, deliverable requests and payouts). Meta processes these messages under its own terms
                    and policies.
                </P>
                <UL items={[
                    'Reply STOP (or tap “Stop updates”) to stop campaign updates on WhatsApp. Reply START to turn them back on.',
                    'Every marketing email has an unsubscribe link. Ticket, pass and account emails still reach you because they’re part of the service.',
                    'Push notifications only arrive on devices where you allowed them, and you can turn them off in your browser or phone settings.',
                ]} />
            </>
        ),
    },
    {
        id: 'instagram',
        title: 'Instagram',
        body: (
            <>
                <P>Creators can connect Instagram in two ways:</P>
                <UL items={[
                    <>
                        <strong>Instagram login.</strong> You sign in to Instagram and allow the Newbi Live app to read your basic
                        profile (the <code>instagram_business_basic</code> permission): user ID, username, name, follower and post
                        counts, account type and profile picture. We store the access token Instagram gives us on our servers, never
                        in your browser, and refresh it and your follower count once a day while your creator profile is active. We
                        don’t read your messages, comments or posts, and we never post for you.
                    </>,
                    <>
                        <strong>Your handle.</strong> When you give us a handle, we look up the public profile through Meta’s
                        Instagram API or, if that fails, from the public profile page or a lookup service (Apify or RapidAPI). We
                        keep the result for up to a day so we don’t look it up again.
                    </>,
                ]} />
                <P>
                    We use this only to verify the account is yours and to place you in the right campaign tier. Your profile
                    picture is copied to our image host so it shows on your creator profile. To disconnect, delete your creator
                    profile (see <A href="#delete-your-data">Delete your data</A>) or remove “Newbi Live” in Instagram under
                    Settings → Apps and websites.
                </P>
            </>
        ),
    },
    {
        id: 'sharing',
        title: 'Who we share it with',
        body: (
            <>
                <P>We don’t sell your personal data. We share it only in these cases:</P>
                <UL items={[
                    'With brands, when you take part in their campaign: your public creator profile, your posts and how they performed. Your phone number, email and UPI ID are not shared with brands unless you agree.',
                    'With event organisers and venues, the details needed to admit you (for example, the name on a pass), when we run entry for them.',
                    'With the service providers below, who process data for us under contract and only for that purpose.',
                    'When the law requires it, or to protect people’s safety or our rights, for example in response to a valid request from authorities.',
                ]} />
                <H3>Service providers</H3>
                <Rows rows={[
                    ['Google Firebase and Google Cloud', 'Sign-in, database, file storage, push notifications and the reCAPTCHA check on SMS codes.'],
                    ['Vercel', 'Hosting for our website, app and servers.'],
                    ['Meta', 'WhatsApp messages and codes (WhatsApp Business Platform) and Instagram connection and lookups.'],
                    ['Google Workspace', 'Sending and receiving our email.'],
                    ['Cloudinary', 'Storing images and files you upload, such as profile photos and post screenshots.'],
                    ['Apify and RapidAPI', 'Backup lookups of public Instagram profiles by handle.'],
                    ['Google Gemini and OpenRouter', 'AI tools our team uses to write content, and translating our public listings into Hinglish. Your account data isn’t sent to them.'],
                    ['Google Fonts, YouTube and Vimeo', 'Fonts on our pages, and videos embedded on some event pages. These may set their own cookies.'],
                ]} />
                <P>
                    Some of these providers store data outside India. We use providers with recognised security practices, and we
                    stay responsible for how your data is handled.
                </P>
            </>
        ),
    },
    {
        id: 'payments',
        title: 'Payments',
        body: (
            <P>
                Ticket payments are made by UPI from your own banking app; we never see your bank or card details. You give us the
                UPI transaction reference (UTR) and our team checks it against the payment before confirming your booking. If an
                event uses an outside payment page, that provider’s terms and privacy policy apply to the payment. Creator payouts
                are sent by UPI to the UPI ID you give us.
            </P>
        ),
    },
    {
        id: 'retention',
        title: 'How long we keep it',
        body: (
            <>
                <UL items={[
                    'Sign-in and verification codes: only a scrambled (hashed) version is stored, for 10 minutes, and each code works once.',
                    'WhatsApp messages in our inbox: 12 months, then deleted automatically.',
                    'Your account, profile, tickets, passes and applications: for as long as your account is open, then deleted or anonymised as described below.',
                    'Instagram access tokens: until you delete your creator profile or disconnect; Instagram tokens also expire after 60 days unless refreshed.',
                    'Payment, ticket and payout records: as long as Indian tax and accounting law requires, even after your account is deleted.',
                    'Email open and click records: for as long as we need them to measure our campaigns, and no longer than 24 months.',
                ]} />
                <P>When we no longer need data, we delete it or remove what links it to you.</P>
            </>
        ),
    },
    {
        id: 'your-choices',
        title: 'Your rights and choices',
        body: (
            <>
                <P>You can ask us to:</P>
                <UL items={[
                    'Tell you what personal data we hold about you and how we use it.',
                    'Correct or update it. Most of your profile you can edit yourself in the app.',
                    'Delete it, or withdraw consent you gave (for example to WhatsApp updates).',
                    'Name someone who can exercise these rights for you if you die or can no longer do so.',
                ]} />
                <P>
                    Write to {PRIVACY} from the email on your account, or tell us the phone number on it, so we can confirm it’s you.
                    We reply within 7 days and act on requests within 30 days. If you’re not happy with our answer, you can
                    complain to the Data Protection Board of India.
                </P>
            </>
        ),
    },
    {
        id: 'delete-your-data',
        title: 'Delete your data',
        body: (
            <>
                <H3>Delete your creator profile (and Instagram connection)</H3>
                <P>
                    In the Newbi app, open your creator profile, go to the Profile tab and choose <strong>Delete creator profile</strong>.
                    This removes your creator profile, your Instagram connection and access token straight away. Your Newbi account,
                    tickets and passes stay.
                </P>
                <H3>Delete your whole Newbi account</H3>
                <P>
                    Email {PRIVACY} with the subject <strong>“Delete my account”</strong>, from the email on your account (or tell us
                    the phone number on it). We confirm it’s you, then within 30 days delete your account, profile, creator profile,
                    Instagram data, applications, entries and messages.
                </P>
                <P>
                    We keep only what the law requires: records of payments, tickets and payouts for tax and accounting. Those are
                    kept separately and deleted when the required period ends.
                </P>
                <H3>Remove Newbi from Instagram</H3>
                <P>
                    In Instagram, go to Settings → Apps and websites, find <strong>Newbi Live</strong> and remove it. That stops our
                    access straight away; to delete what we already hold, use one of the options above.
                </P>
            </>
        ),
    },
    {
        id: 'cookies',
        title: 'Cookies and storage on your device',
        body: (
            <>
                <P>We use a few first-party cookies and your browser’s storage to make the site work:</P>
                <UL items={[
                    'Keeping you signed in (Firebase stores this in your browser).',
                    'Your language and theme choice, shared across newbi.live so the site and the app agree.',
                    'A small “signed in” hint with your first name and photo, so newbi.live can greet you.',
                    'Offline copies of your passes, so they open at the gate without signal, and drafts of forms you haven’t finished.',
                ]} />
                <P>We don’t use advertising or analytics cookies. Clearing your browser data removes all of these.</P>
            </>
        ),
    },
    {
        id: 'security',
        title: 'Security',
        body: (
            <P>
                Data is sent over encrypted connections. Access is limited by role: only our team members who need it can see
                personal data, and Instagram tokens and payment details are kept away from the browser. Codes are stored hashed and
                expire quickly, and we rate-limit sign-in attempts. No system is perfectly secure; if a breach affects your data, we
                will tell you and the Data Protection Board as the law requires.
            </P>
        ),
    },
    {
        id: 'children',
        title: 'Age',
        body: (
            <P>
                Newbi is for people aged 18 and over. If you’re under 18, you need a parent or guardian’s consent to use Newbi, and
                some features (such as creator campaigns and ticketed shows marked 18+) aren’t open to you. If you believe a child
                has given us data without that consent, write to {PRIVACY} and we’ll delete it.
            </P>
        ),
    },
    {
        id: 'changes',
        title: 'Changes to this policy',
        body: (
            <P>
                When we change how we use data, we update this page and the date at the top. If the change matters, for example a
                new purpose or a new kind of data, we’ll tell you by email or in the app before it applies.
            </P>
        ),
    },
    {
        id: 'contact',
        title: 'Contact',
        body: (
            <P>
                Privacy questions, data requests and complaints: {PRIVACY}. Our Grievance Officer handles every complaint sent to
                this address. For anything else, write to <A href="mailto:support@newbi.live">support@newbi.live</A>.
            </P>
        ),
    },
];

const Privacy = () => (
    <LegalDoc
        eyebrow="Privacy"
        title="Privacy"
        highlight="policy."
        updated={UPDATED}
        intro={<p>What Newbi collects when you use our website, app, WhatsApp and emails, why we need it, who helps us process it, and how to see, change or delete it.</p>}
        sections={sections}
    />
);

export default Privacy;
