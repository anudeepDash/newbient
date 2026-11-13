import { firstName } from '../layout.js';

/**
 * Sent only when the team asks, from the admin's Creators (bulk → "Ask to add
 * gender"), to creators who applied before the form asked it. The button opens
 * their dashboard with the one-tap gender card. data: { name }
 */
export default (data = {}, ctx = {}) => {
    const app = String(ctx.appOrigin || '').replace(/\/+$/, '');
    return {
        sender: 'creators',
        kind: 'transactional',
        subject: 'One quick thing for your Newbi creator profile',
        preheader: 'Add your gender in one tap, so we can match you to the right campaigns.',
        eyebrow: 'Newbi Creators',
        title: 'Add your gender to your profile',
        blocks: [
            { p: `Hi ${firstName(data.name, 'there')}, some brands brief campaigns for a mix of creators, or only for women or only for men. To match you to the right ones, we now ask creators for their gender.` },
            { p: 'It takes one tap on your creator dashboard. You can pick Female, Male, Non-binary or Prefer not to say.' },
            { note: 'Only the Newbi team sees it, and we use it only to match you to campaigns. You can change it any time from your creator profile.' },
        ],
        cta: { label: 'Add my gender', url: `${app}/creator?ask=gender` },
        reason: "You're getting this because you're a Newbi creator.",
    };
};
