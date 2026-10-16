import { firstName } from '../layout.js';

/** data: { name, reason, reapplyUrl } */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'transactional',
    subject: 'About your Newbi Creators application',
    preheader: "We couldn't approve your profile this time.",
    eyebrow: 'Newbi Creators',
    title: 'Not this time',
    blocks: [
        { p: `Hi ${firstName(data.name)}, thanks for applying to Newbi Creators. We've reviewed your profile and can't approve it right now.` },
        { quote: data.reason },
        { p: 'This often comes down to audience size or how recent your content is. You are welcome to update your profile and apply again later.' },
    ],
    cta: data.reapplyUrl ? { label: 'Update my profile', url: data.reapplyUrl } : null,
    reason: "You're getting this because you applied to Newbi Creators.",
});
