import { firstName } from '../layout.js';

/** Contact-form auto-reply. data: { name, message } */
export default (data = {}) => ({
    sender: 'support',
    kind: 'transactional',
    subject: 'We got your message',
    preheader: "Thanks for getting in touch. We'll reply soon.",
    eyebrow: 'Newbi',
    title: `Thanks, ${firstName(data.name)}`,
    blocks: [
        { p: "We've received your message and someone from the team will get back to you, usually within one working day." },
        { quote: data.message ? String(data.message).slice(0, 1200) : '' },
        { note: 'Need to add something? Just reply to this email.' },
    ],
    reason: "You're getting this because you sent us a message on newbi.live.",
});
