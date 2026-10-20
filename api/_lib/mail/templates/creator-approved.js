import { firstName } from '../layout.js';

/** data: { name, dashboardUrl, cityGroupName, cityGroupUrl } */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'transactional',
    subject: 'Your Newbi creator profile is approved',
    preheader: 'You can apply to brand campaigns from today. Here is how it works.',
    eyebrow: 'Creators',
    title: `Welcome to Newbi Creators, ${firstName(data.name)}`,
    blocks: [
        { p: "We've reviewed your profile and approved it. From now on, brand campaigns in your city show up on your creator dashboard, and you can apply to any of them." },
        { title: 'How campaigns work', steps: [
            ['Apply', 'Open a campaign, read the brief and send your application.'],
            ['Get shortlisted', 'We pick creators for each campaign with the brand. If you are picked, we tell you by email and in the app.'],
            ['Post and submit', 'Share your content, then submit the link in the campaign.'],
        ] },
        data.cityGroupUrl ? { p: `Local campaigns and guestlist passes are also posted in the ${data.cityGroupName || 'city'} creators group on WhatsApp.` } : null,
        data.cityGroupUrl ? { button: { label: `Join the ${data.cityGroupName || 'city'} group`, url: data.cityGroupUrl } } : null,
    ],
    cta: { label: 'Open my dashboard', url: data.dashboardUrl || '/creator' },
    reason: "You're getting this because you applied to Newbi Creators.",
});
