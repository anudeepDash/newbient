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
        subject: approved ? "You're in: welcome to Newbi Creators" : 'We got your Newbi Creators application',
        preheader: approved ? 'Your creator pass is live. Open campaigns are waiting.' : "We're reviewing your profile and will email you soon.",
        eyebrow: 'Newbi Creators',
        title: approved ? `Welcome aboard, ${firstName(data.name)}` : `Thanks for applying, ${firstName(data.name)}`,
        blocks: [
            { p: approved
                ? "Your creator profile is approved. You can browse open campaigns, apply in a tap and track your deliverables from your creator dashboard."
                : "We've got your application. Our team checks every profile by hand, and you'll hear from us by email as soon as it's reviewed." },
            { details: [['Creator pass', data.passId ? `NWB-CR-${String(data.passId).toUpperCase().replace(/^NWB-CR-/, '')}` : ''], ['Instagram', data.handle ? `@${String(data.handle).replace(/^@/, '')}` : ''], ['City', data.city]] },
            data.verifyUrl ? { p: 'Please confirm this email address so we can reach you about campaigns:' } : null,
            data.verifyUrl ? { button: { label: 'Confirm my email', url: data.verifyUrl } } : null,
            data.cityGroupUrl ? { p: `Join the ${data.cityGroupName || data.city || 'city'} creators group on WhatsApp for local campaigns and meetups.` } : null,
            data.cityGroupUrl ? { button: { label: `Join the ${data.cityGroupName || 'city'} group`, url: data.cityGroupUrl } } : null,
        ],
        cta: { label: 'Open creator dashboard', url: data.dashboardUrl || '/creator-dashboard' },
        reason: "You're getting this because you applied to Newbi Creators.",
    };
};
