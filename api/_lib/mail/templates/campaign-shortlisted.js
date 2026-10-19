import { firstName, formatDate } from '../layout.js';

/**
 * A creator was shortlisted for a campaign: join the group, then submit in the campaign.
 * data: { name, campaignTitle, brand, reward, deadline, groupLink, campaignUrl, message }
 */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'transactional',
    subject: `You're shortlisted${data.campaignTitle ? `: ${data.campaignTitle}` : ''}`,
    preheader: data.groupLink ? 'Join the campaign WhatsApp group to get started.' : 'Your deliverables are in the campaign.',
    eyebrow: data.brand || 'Newbi campaign',
    title: "You're shortlisted",
    hero: data.image ? { url: data.image, alt: data.campaignTitle || '' } : null,
    blocks: [
        { p: `Hi ${firstName(data.name)}, you've been shortlisted for ${data.campaignTitle ? `the ${data.campaignTitle} campaign` : 'a Newbi campaign'}.` },
        { quote: data.message },
        { stats: [['Brand', data.brand], ['Reward', data.reward], ['Deadline', formatDate(data.deadline).replace(/^\w+,\s*/, '')]] },
        {
            list: [
                data.groupLink ? 'Join the campaign WhatsApp group. Briefs and updates are shared there.' : null,
                'Open the campaign in the Newbi app to see your deliverables.',
                'Post, then submit each deliverable in the campaign (or mark it as submitted after sending its form).',
            ],
        },
        data.groupLink ? { button: { label: 'Join the WhatsApp group', url: data.groupLink } } : null,
    ],
    cta: { label: 'Open campaign', url: data.campaignUrl || '/creator' },
    reason: "You're getting this because you applied to a Newbi creator campaign.",
});
