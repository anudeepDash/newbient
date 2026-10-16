import { firstName } from '../layout.js';

/** data: { name, dashboardUrl, cityGroupName, cityGroupUrl } */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'transactional',
    subject: "You're approved: welcome to Newbi Creators",
    preheader: 'Your creator profile is approved. Start applying to campaigns.',
    eyebrow: 'Approved',
    title: `You're approved, ${firstName(data.name)}`,
    blocks: [
        { p: 'Good news: your Newbi creator profile has been approved. Open campaigns that match your city and niche are now in your dashboard, and you can apply in a tap.' },
        { list: ['Apply to campaigns that fit you', 'Submit your deliverables from the dashboard', 'Get tickets and updates right inside each campaign'] },
        data.cityGroupUrl ? { button: { label: `Join the ${data.cityGroupName || 'city'} creators group`, url: data.cityGroupUrl } } : null,
    ],
    cta: { label: 'See open campaigns', url: data.dashboardUrl || '/creator-dashboard' },
    reason: "You're getting this because you applied to Newbi Creators.",
});
