import { firstName, formatDate } from '../layout.js';

/**
 * A ticket sent to a creator for their campaign (Newbi QR pass, a link from
 * the ticketing partner, or an attached PDF), or a confirmation of their place
 * without a QR code (data.confirmation).
 * data: { name, campaignTitle, eventName, date, venue, tier, qty, note, ticketUrl, hasPdf, ref, confirmation, upgradedTo, previousTier }
 */
export default (data = {}) => {
    const what = data.confirmation ? 'confirmation' : 'ticket';
    // A category change (data.upgradedTo): same pass, new tier.
    if (data.upgradedTo) {
        return {
            sender: 'creators',
            kind: 'transactional',
            subject: `You're now ${data.upgradedTo}${data.eventName ? ` for ${data.eventName}` : ''}`,
            preheader: `Your ${what} has been updated to ${data.upgradedTo}.`,
            eyebrow: 'Campaign ticket',
            title: `You've been upgraded to ${data.upgradedTo}`,
            hero: data.image ? { url: data.image, alt: data.eventName || data.campaignTitle || '' } : null,
            blocks: [
                { p: `Hi ${firstName(data.name)}, your ${what}${data.campaignTitle ? ` for the ${data.campaignTitle} campaign` : ''} is now ${data.upgradedTo}${data.previousTier ? ` (was ${data.previousTier})` : ''}. Same ${data.confirmation ? 'confirmation' : 'pass'}, nothing else to do.` },
                { details: [['Event', data.eventName], ['Date', formatDate(data.date, { withTime: /T\d\d:/.test(String(data.date || '')) })], ['Venue', data.venue], ['Category', data.upgradedTo], ['Tickets', Number(data.qty) > 1 ? data.qty : ''], ['Pass code', data.ref]] },
            ],
            cta: data.ticketUrl ? { label: data.confirmation ? 'View confirmation' : 'View ticket', url: data.ticketUrl } : null,
            reason: "You're getting this because you're part of a Newbi creator campaign.",
        };
    }
    return {
        sender: 'creators',
        kind: 'transactional',
        subject: data.confirmation
            ? `You're confirmed${data.eventName ? ` for ${data.eventName}` : ''}${data.campaignTitle && data.campaignTitle !== data.eventName ? ` · ${data.campaignTitle}` : ''}`
            : `Your ticket${data.eventName ? ` for ${data.eventName}` : ''}${data.campaignTitle ? ` · ${data.campaignTitle}` : ''}`,
        preheader: data.hasPdf ? 'Your ticket is attached and in your campaign.' : `Your ${what} is ready in your campaign.`,
        eyebrow: data.confirmation ? 'Campaign confirmation' : 'Campaign ticket',
        title: data.confirmation ? "You're confirmed" : 'Your ticket is ready',
        hero: data.image ? { url: data.image, alt: data.eventName || data.campaignTitle || '' } : null,
        blocks: [
            {
                p: data.confirmation
                    ? `Hi ${firstName(data.name)}, your place${data.campaignTitle ? ` for the ${data.campaignTitle} campaign` : ''} is confirmed. You'll find it inside the campaign in the Newbi app.`
                    : `Hi ${firstName(data.name)}, here's your ticket${data.campaignTitle ? ` for the ${data.campaignTitle} campaign` : ''}. It's also inside the campaign in the Newbi app.`,
            },
            { details: [['Event', data.eventName], ['Date', formatDate(data.date, { withTime: /T\d\d:/.test(String(data.date || '')) })], ['Venue', data.venue], ['Tier', data.tier], ['Tickets', Number(data.qty) > 1 ? data.qty : ''], ['Pass code', data.ref]] },
            { quote: data.note },
            data.hasPdf ? { document: { kind: 'PDF', name: data.pdfFilename || 'ticket.pdf', meta: ['Attached to this email', data.eventName] } } : null,
        ],
        cta: data.ticketUrl ? { label: data.confirmation ? 'View confirmation' : 'View ticket', url: data.ticketUrl } : null,
        reason: "You're getting this because you're part of a Newbi creator campaign.",
    };
};
