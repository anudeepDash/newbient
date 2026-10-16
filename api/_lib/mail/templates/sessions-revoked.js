import { firstName, formatDate } from '../layout.js';

/** data: { name, when, ip, device } */
export default (data = {}) => ({
    sender: 'security',
    kind: 'transactional',
    subject: 'You were signed out of all devices',
    preheader: 'Every device signed in to your Newbi account has been logged out.',
    eyebrow: 'Security',
    title: 'Signed out everywhere',
    blocks: [
        { p: `Hi ${firstName(data.name)}, every device that was signed in to your Newbi account has just been logged out.` },
        { details: [['When', formatDate(data.when || new Date().toISOString(), { withTime: true })], ['Device', data.device], ['IP address', data.ip]] },
        { p: "If you did this, there's nothing else to do. If you didn't, reset your password straight away." },
    ],
    cta: { label: 'Sign in again', url: data.loginUrl || '/' },
    reason: 'Security email from Newbi. We send these even if you unsubscribed from updates.',
});
