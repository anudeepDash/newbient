import { firstName, formatDate } from '../layout.js';

/**
 * A creator was shortlisted for a campaign: join the group, then submit in the campaign.
 * data: { name, campaignTitle, brand, reward, deadline, groupLink, campaignUrl, message }
 */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'transactional',
    subject: data.campaignTitle ? `You're shortlisted for ${data.campaignTitle}` : "You're shortlisted for a Newbi campaign",
    preheader: data.groupLink ? 'Next step: join the campaign WhatsApp group, where the brief and dates are shared.' : 'Your deliverables and dates are in the campaign.',
    eyebrow: 'Shortlisted',
    title: "You're shortlisted",
    hero: data.image ? { url: data.image, alt: data.campaignTitle || '' } : null,
    blocks: [
        { p: `Hi ${firstName(data.name)}, you've been picked for ${data.campaignTitle ? `the ${data.campaignTitle} campaign` : 'a Newbi campaign'}${data.brand ? ` with ${data.brand}` : ''}. Here's what happens next.` },
        { quote: data.message },
        { stats: [['Brand', data.brand], ['Reward', data.reward, 'accent'], ['Deadline', formatDate(data.deadline).replace(/^\w+,\s*/, '')]] },
        {
            list: [
                data.groupLink ? 'Join the campaign WhatsApp group. The brief, dates and any changes are shared there.' : null,
                'Open the campaign in the Newbi app to see exactly what to post.',
                'Post, then submit the link for each deliverable in the campaign. We review every submission.',
            ],
        },
        data.groupLink ? { button: { label: 'Join the WhatsApp group', url: data.groupLink } } : null,
    ],
    cta: { label: 'Open campaign', url: data.campaignUrl || '/creator' },
    reason: "You're getting this because you applied to a Newbi creator campaign.",
});
