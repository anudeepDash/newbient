import { firstName } from '../layout.js';

/**
 * Sent once when a creator applies. Replaces the two old welcome emails.
 * data: { name, status: 'approved'|'pending', passId, handle, city, cityGroupName, cityGroupUrl, verifyUrl, dashboardUrl }
 */
export default (data = {}) => {
    const approved = data.status === 'approved';
    return {
        sender: 'creators',
        kind: 'transactional',
        subject: approved ? 'Your Newbi creator profile is approved' : 'We received your Newbi Creators application',
        preheader: approved ? 'You can apply to brand campaigns from today.' : 'Our team reviews every profile by hand. We will email you with the result.',
        eyebrow: 'Creators',
        title: approved ? `Welcome to Newbi Creators, ${firstName(data.name)}` : `Thanks for applying, ${firstName(data.name)}`,
        blocks: [
            { p: approved
                ? 'Your creator profile is approved. Brand campaigns in your city show up on your creator dashboard, where you can apply and track your deliverables.'
                : 'We have your application. Someone on our team looks at every profile, and we will email you as soon as yours is reviewed. There is nothing else you need to do for now.' },
            { details: [['Creator ID', data.passId ? `NWB-CR-${String(data.passId).toUpperCase().replace(/^NWB-CR-/, '')}` : ''], ['Instagram', data.handle ? `@${String(data.handle).replace(/^@/, '')}` : ''], ['City', data.city]] },
            data.verifyUrl ? { p: 'Please confirm this email address so campaign updates reach you:' } : null,
            data.verifyUrl ? { button: { label: 'Confirm my email', url: data.verifyUrl } } : null,
            data.cityGroupUrl ? { p: `Local campaigns and meetups are also posted in the ${data.cityGroupName || data.city || 'city'} creators group on WhatsApp.` } : null,
            data.cityGroupUrl ? { button: { label: `Join the ${data.cityGroupName || 'city'} group`, url: data.cityGroupUrl } } : null,
        ],
        cta: { label: approved ? 'Open my dashboard' : 'View my application', url: data.dashboardUrl || '/creator' },
        reason: "You're getting this because you applied to Newbi Creators.",
    };
};
