import { firstName, formatDate } from '../layout.js';

/**
 * A ticket sent to a creator for their campaign (Newbi QR pass, a link from
 * the ticketing partner, or an attached PDF).
 * data: { name, campaignTitle, eventName, date, venue, tier, qty, note, ticketUrl, hasPdf, ref }
 */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'transactional',
    subject: `Your ticket${data.eventName ? ` for ${data.eventName}` : ''}${data.campaignTitle ? ` · ${data.campaignTitle}` : ''}`,
    preheader: data.hasPdf ? 'Your ticket is attached and in your campaign.' : 'Your ticket is ready in your campaign.',
    eyebrow: 'Campaign ticket',
    title: 'Your ticket is ready',
    hero: data.image ? { url: data.image, alt: data.eventName || data.campaignTitle || '' } : null,
    blocks: [
        { p: `Hi ${firstName(data.name)}, here's your ticket${data.campaignTitle ? ` for the ${data.campaignTitle} campaign` : ''}. It's also inside the campaign in the Newbi app.` },
        { details: [['Event', data.eventName], ['Date', formatDate(data.date, { withTime: /T\d\d:/.test(String(data.date || '')) })], ['Venue', data.venue], ['Tier', data.tier], ['Tickets', Number(data.qty) > 1 ? data.qty : ''], ['Pass code', data.ref]] },
        { quote: data.note },
        data.hasPdf ? { document: { kind: 'PDF', name: data.pdfFilename || 'ticket.pdf', meta: ['Attached to this email', data.eventName] } } : null,
    ],
    cta: data.ticketUrl ? { label: 'View ticket', url: data.ticketUrl } : null,
    reason: "You're getting this because you're part of a Newbi creator campaign.",
});
