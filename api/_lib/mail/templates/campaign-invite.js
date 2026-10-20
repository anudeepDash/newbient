import { excerpt, firstName, formatDate } from '../layout.js';

/**
 * A new campaign that fits the creator. `description` is the brief from the
 * admin editor (HTML); the email shows a plain-text teaser of it.
 * data: { name, campaignTitle, brand, reward, city, deadline, description, campaignUrl, image }
 */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'marketing',
    subject: data.brand ? `${data.brand} campaign: ${data.campaignTitle || 'applications open'}` : `New campaign: ${data.campaignTitle || 'applications open'}`,
    preheader: [data.brand, data.reward ? `Reward: ${data.reward}` : '', data.city].filter(Boolean).join(' · ') || 'Applications are open. Read the brief and apply.',
    eyebrow: 'New campaign',
    title: data.campaignTitle || 'A new campaign is open',
    hero: data.image ? { url: data.image, alt: data.campaignTitle || '' } : null,
    blocks: [
        { p: `Hi ${data.name ? firstName(data.name) : 'there'}, ${data.brand ? `${data.brand} has` : 'a brand has'} opened a campaign for creators${data.city ? ` in ${data.city}` : ''}. Here is the short version of the brief.` },
        { stats: [['Reward', data.reward, 'accent'], ['City', data.city], ['Apply by', formatDate(data.deadline).replace(/^\w+,\s*/, '')]] },
        { p: excerpt(data.description, 360) },
    ],
    cta: { label: 'Read the brief', url: data.campaignUrl || '/campaigns' },
    reason: "You're getting this because you're an approved Newbi creator. You can turn off campaign emails in your settings or with the link below.",
});
