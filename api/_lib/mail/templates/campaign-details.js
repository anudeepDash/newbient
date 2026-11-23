import { firstName, formatDate } from '../layout.js';

/**
 * The campaign's details for one creator, sent by the team from Outreach → Message → Email details
 * (outreach-email-details) when a creator asks for them in writing. Built by
 * src/lib/outreach/campaignDetails.js.
 * data: { name, campaignTitle, brand, city, image, note, event: { name, date, time, venue } | null,
 *         rewards: { reward, payout, passes } | null, deliverables: [{ title, due, summary }], groupLink, campaignUrl }
 */
const day = (d) => formatDate(d).replace(/,\s*\d{4}$/, '');

export default (data = {}) => {
    const title = data.campaignTitle || 'your campaign';
    const ev = data.event;
    const r = data.rewards;
    const tasks = Array.isArray(data.deliverables) ? data.deliverables : [];
    return {
        sender: 'creators',
        kind: 'transactional',
        subject: `Your campaign details: ${title}`,
        preheader: `What you'll post, by when${r ? ', and what you get' : ''}, for ${title}.`,
        eyebrow: 'Campaign details',
        title: `You're on ${title}`,
        hero: data.image ? { url: data.image, alt: title } : null,
        blocks: [
            { p: `Hi ${firstName(data.name)}, this confirms your place in ${title}${data.brand ? ` with ${data.brand}` : ''}. Here are the details, so you have them in writing.` },
            { quote: data.note },
            { details: [['Campaign', title], ['Brand', data.brand], ['City', data.city]] },
            ev ? { details: [['Event', ev.name], ['Date', ev.date ? formatDate(ev.date) : ''], ['Time', ev.time], ['Venue', ev.venue]], title: 'Event' } : null,
            r ? { details: [['Reward', r.reward], ['Payout', r.payout], ['Passes', r.passes]], title: 'What you get' } : null,
            tasks.length ? {
                title: 'What to post',
                steps: tasks.map(t => [t.title, [t.due ? `Due ${day(t.due)}.` : '', t.summary].filter(Boolean).join(' ') || 'Details in the app.']),
            } : null,
            data.groupLink ? { p: 'Briefs, dates and any changes are shared in the campaign WhatsApp group.' } : null,
            data.groupLink ? { button: { label: 'Join the WhatsApp group', url: data.groupLink } } : null,
            { note: 'Questions, or something here doesn’t match what you agreed? Reply to this email and the Newbi team will sort it out.' },
        ],
        cta: data.campaignUrl ? { label: 'Open the campaign', url: data.campaignUrl } : null,
        reason: "You're getting this because the Newbi team confirmed your place in this creator campaign.",
    };
};
