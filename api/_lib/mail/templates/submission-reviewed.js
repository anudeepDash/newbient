import { firstName } from '../layout.js';

const COPY = {
    approved: { title: 'Submission approved', line: 'has been approved. Nice work.' },
    rejected: { title: 'Submission not approved', line: "wasn't approved." },
    changes: { title: 'Changes requested', line: 'needs a few changes before we can approve it.' },
};

/** data: { name, campaignTitle, taskTitle, status: 'approved'|'rejected'|'changes', feedback, campaignUrl } */
export default (data = {}) => {
    const copy = COPY[data.status] || COPY.changes;
    const what = data.taskTitle ? `Your submission for "${data.taskTitle}"` : 'Your submission';
    return {
        sender: 'creators',
        kind: 'transactional',
        subject: `${copy.title}${data.campaignTitle ? `: ${data.campaignTitle}` : ''}`,
        preheader: `${what} ${copy.line}`,
        eyebrow: data.campaignTitle || 'Campaign update',
        title: copy.title,
        blocks: [
            { p: `Hi ${firstName(data.name)}, ${what.charAt(0).toLowerCase()}${what.slice(1)}${data.campaignTitle ? ` in ${data.campaignTitle}` : ''} ${copy.line}` },
            data.feedback ? { quote: data.feedback } : null,
            data.status !== 'approved' ? { p: 'Open the campaign to see the details and resubmit.' } : null,
        ],
        cta: { label: 'Open campaign', url: data.campaignUrl || '/creator-dashboard' },
        reason: "You're getting this because you're part of a Newbi creator campaign.",
    };
};
