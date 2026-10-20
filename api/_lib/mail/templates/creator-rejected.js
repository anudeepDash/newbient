import { firstName } from '../layout.js';

/** data: { name, reason, reapplyUrl } */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'transactional',
    subject: 'Update on your Newbi Creators application',
    preheader: "We can't approve your profile right now. Here's why, and how to apply again.",
    eyebrow: 'Creators',
    title: 'About your application',
    blocks: [
        { p: `Hi ${firstName(data.name)}, thank you for applying to Newbi Creators. We've looked at your profile and can't approve it right now.` },
        { quote: data.reason },
        { p: 'Most of the time this comes down to audience size or how recently you have posted. You can update your profile and apply again whenever you like, and we will review it fresh.' },
    ],
    cta: data.reapplyUrl ? { label: 'Update my profile', url: data.reapplyUrl } : null,
    reason: "You're getting this because you applied to Newbi Creators.",
});
