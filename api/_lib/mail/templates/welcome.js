import { firstName } from '../layout.js';

/** Account created. data: { name } */
export default (data = {}, ctx = {}) => ({
    sender: 'noreply',
    kind: 'transactional',
    subject: 'Welcome to Newbi',
    preheader: 'Your account is ready: passes, guestlists, campaigns and giveaways in one place.',
    eyebrow: 'Welcome',
    title: `Welcome, ${firstName(data.name)}`,
    blocks: [
        { p: 'Your Newbi account is ready. Guestlists, event passes, creator campaigns and giveaways all live in one place now, and anything you sign up for shows up in your account.' },
        { note: "You're getting this because an account was created with this email address. If that wasn't you, reply and we'll sort it out." },
    ],
    cta: { label: 'Open Newbi', url: ctx.appOrigin || '/' },
    reason: 'Account email from Newbi.',
});
