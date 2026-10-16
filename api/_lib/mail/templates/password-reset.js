import { firstName } from '../layout.js';

/** data: { name, resetUrl } */
export default (data = {}) => ({
    sender: 'security',
    kind: 'transactional',
    subject: 'Reset your Newbi password',
    preheader: 'Use this link to choose a new password. It expires soon.',
    eyebrow: 'Security',
    title: 'Reset your password',
    blocks: [
        { p: `Hi ${firstName(data.name)}, we got a request to reset the password for your Newbi account.` },
        { p: 'Tap the button below to choose a new one. The link works once and expires soon.' },
        { note: "If you didn't ask for this, you can ignore this email. Your password won't change." },
    ],
    cta: { label: 'Choose a new password', url: data.resetUrl },
    reason: 'Security email from Newbi. We send these even if you unsubscribed from updates.',
});
