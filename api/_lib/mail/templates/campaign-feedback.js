import { firstName } from '../layout.js';

/**
 * The day after a campaign's event: asks everyone who took part how it went,
 * for a short testimonial, and whether we may publish it (api/_lib/campaignFeedback.js).
 * data: { name, campaignTitle, eventName, image, formUrl }
 */
export default (data = {}) => {
    const title = data.campaignTitle || data.eventName || 'the campaign';
    return {
        sender: 'creators',
        kind: 'transactional',
        subject: `How was ${title}? Tell us in a minute`,
        preheader: 'A quick note on how it went, and a few lines for our site if you like.',
        eyebrow: 'Campaign feedback',
        title: `Thanks for being part of ${title}`,
        hero: data.image ? { url: data.image, alt: title } : null,
        blocks: [
            { p: `Hi ${firstName(data.name)}, thank you for creating with Newbi on ${title}. We'd love to hear how it went for you: what worked, and what we should fix before the next one.` },
            {
                steps: [
                    ['Rate the campaign', 'One tap, 1 to 5 stars.'],
                    ['Tell us what to keep and what to fix', 'Optional, as short as you like.'],
                    ['Add a testimonial', 'Optional. A few lines about working with Newbi. You choose if we can show it on our site, with your name or first name only.'],
                ],
            },
            { note: 'It takes about a minute. You can change your answers, or ask us to take your words down, from the same link any time.' },
        ],
        cta: data.formUrl ? { label: 'Share feedback', url: data.formUrl } : null,
        reason: "You're getting this because you took part in a Newbi creator campaign.",
    };
};
