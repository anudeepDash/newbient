import { firstName, formatDate } from '../layout.js';

/**
 * A ticket sent to a creator for their campaign (Newbi QR pass, a link from
 * the ticketing partner, or an attached PDF), or a confirmation of their place
 * without a QR code (data.confirmation). data.upgradedTo: their pass moved to
 * another category (an upgrade); same details, new heading.
 * data: { name, campaignTitle, eventName, date, time, venue, boxOffice, entry, tier, qty, note,
 *         ticketUrl, hasPdf, ref, confirmation, upgradedTo, previousTier }
 */

// Where to go at the venue (editor → Event passes → Entry).
const ENTRY = {
    guestlist: { label: 'Guestlist counter', how: (pass) => `At the venue, go to the guestlist counter${pass ? ' and show your pass' : ' and give your name'}.` },
    tickets: { label: 'Ticket counter', how: (pass) => `At the venue, join the regular ticket holders' entry${pass ? ' and show your pass' : ''}.` },
};

const details = (data) => [
    ['Event', data.eventName],
    ['Date', formatDate(data.date, { withTime: !data.time && /T\d\d:/.test(String(data.date || '')) })],
    ['Time', data.time],
    ['Box office', data.boxOffice],
    ['Venue', data.venue],
    ['Entry', ENTRY[data.entry]?.label],
    ['Category', data.upgradedTo || data.tier],
    ['Tickets', Number(data.qty) > 1 ? data.qty : ''],
    ['Pass code', data.ref],
];

export default (data = {}) => {
    const what = data.confirmation ? 'confirmation' : 'ticket';
    const entry = ENTRY[data.entry] ? { p: ENTRY[data.entry].how(!data.confirmation) } : null;
    const shared = [
        { details: details(data) },
        entry,
        { quote: data.note },
        data.hasPdf ? { document: { kind: 'PDF', name: data.pdfFilename || 'ticket.pdf', meta: ['Attached to this email', data.eventName] } } : null,
    ];
    const base = {
        sender: 'creators',
        kind: 'transactional',
        hero: data.image ? { url: data.image, alt: data.eventName || data.campaignTitle || '' } : null,
        cta: data.ticketUrl ? { label: data.confirmation ? 'View confirmation' : 'View ticket', url: data.ticketUrl } : null,
        reason: "You're getting this because you're part of a Newbi creator campaign.",
    };
    if (data.upgradedTo) {
        return {
            ...base,
            subject: `You've been upgraded to ${data.upgradedTo}${data.eventName ? ` · ${data.eventName}` : ''}`,
            preheader: `Your ${what} is now ${data.upgradedTo}. All the details inside.`,
            eyebrow: 'Upgrade',
            title: `You've been upgraded to ${data.upgradedTo}`,
            blocks: [
                { p: `Hi ${firstName(data.name)}, good news: your ${what}${data.campaignTitle ? ` for the ${data.campaignTitle} campaign` : ''} is now ${data.upgradedTo}${data.previousTier ? ` (was ${data.previousTier})` : ''}. Same ${data.confirmation ? 'confirmation' : 'pass and code'}, nothing else to do. Here are your details again.` },
                ...shared,
            ],
        };
    }
    return {
        ...base,
        subject: data.confirmation
            ? `You're confirmed${data.eventName ? ` for ${data.eventName}` : ''}${data.campaignTitle && data.campaignTitle !== data.eventName ? ` · ${data.campaignTitle}` : ''}`
            : `Your ticket${data.eventName ? ` for ${data.eventName}` : ''}${data.campaignTitle ? ` · ${data.campaignTitle}` : ''}`,
        preheader: data.hasPdf ? 'Your ticket is attached and in your campaign.' : `Your ${what} is ready in your campaign.`,
        eyebrow: data.confirmation ? 'Campaign confirmation' : 'Campaign ticket',
        title: data.confirmation ? "You're confirmed" : 'Your ticket is ready',
        blocks: [
            {
                p: data.confirmation
                    ? `Hi ${firstName(data.name)}, your place${data.campaignTitle ? ` for the ${data.campaignTitle} campaign` : ''} is confirmed. You'll find it inside the campaign in the Newbi app.`
                    : `Hi ${firstName(data.name)}, here's your ticket${data.campaignTitle ? ` for the ${data.campaignTitle} campaign` : ''}. It's also inside the campaign in the Newbi app.`,
            },
            ...shared,
        ],
    };
};
