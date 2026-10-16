import { firstName } from '../layout.js';

/** A one-to-one message from staff to a creator. data: { name, subject, message (plain text), messageHtml } */
export default (data = {}) => ({
    sender: 'creators',
    kind: 'transactional',
    subject: data.subject || 'A message from Newbi Creators',
    eyebrow: 'Newbi Creators',
    title: data.subject || '',
    blocks: [
        { p: `Hi ${firstName(data.name, 'there')},` },
        data.messageHtml ? { html: data.messageHtml } : { p: data.message },
    ],
    reason: "You're getting this because you're a Newbi creator.",
});
