import { firstName } from '../layout.js';

/** Account created. data: { name } */
export default (data = {}, ctx = {}) => ({
    sender: 'noreply',
    kind: 'transactional',
    subject: 'Welcome to Newbi',
    preheader: 'Your account is ready. Your passes, guestlists and campaigns will all show up in it.',
    eyebrow: 'Welcome',
    title: `Welcome, ${firstName(data.name)}`,
    blocks: [
        { p: 'Your Newbi account is ready. Any guestlist, event pass, creator campaign or giveaway you sign up for will show up in it, so you always know where to find them.' },
        { note: "You're getting this because an account was created with this email address. If that wasn't you, reply and we'll sort it out." },
    ],
    cta: { label: 'Open Newbi', url: ctx.appOrigin || '/' },
    reason: 'Account email from Newbi.',
});
