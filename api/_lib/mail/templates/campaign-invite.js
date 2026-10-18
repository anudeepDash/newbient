import { excerpt, firstName, formatDate } from '../layout.js';

/**
 * A new campaign that fits the creator. `description` is the brief from the
 * admin editor (HTML); the email shows a plain-text teaser of it.
 * data: { name, campaignTitle, brand, reward, city, deadline, description, campaignUrl, image }
 */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'marketing',
    subject: `New campaign: ${data.campaignTitle || 'a new brand campaign'}`,
    preheader: [data.brand, data.reward ? `Reward: ${data.reward}` : '', data.city].filter(Boolean).join(' · ') || 'A new campaign is open for you.',
    eyebrow: 'New campaign',
    title: data.campaignTitle || 'A new campaign is open',
    blocks: [
        data.image ? { image: { url: data.image, alt: data.campaignTitle || '' } } : null,
        { p: `Hi ${data.name ? firstName(data.name) : 'there'}, a new campaign that fits your profile just opened.` },
        { details: [['Brand', data.brand], ['Reward', data.reward], ['City', data.city], ['Apply by', formatDate(data.deadline)]] },
        { p: excerpt(data.description, 360) },
    ],
    cta: { label: 'View campaign', url: data.campaignUrl || '/campaigns' },
    reason: "You're getting this because you're a Newbi creator. You can stop campaign emails any time.",
});
