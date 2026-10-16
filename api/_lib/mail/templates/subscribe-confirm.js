/** Double opt-in for someone who unsubscribed and signs up again. data: { confirmUrl } */
export default (data = {}) => ({
    sender: 'weekly',
    kind: 'transactional',
    subject: 'Confirm your Newbi subscription',
    preheader: 'One tap to start getting our emails again.',
    eyebrow: 'Newsletter',
    title: 'Confirm your subscription',
    blocks: [
        { p: 'You unsubscribed from Newbi emails before, so we need you to confirm before we send you anything again.' },
        { note: "If you didn't sign up, ignore this email and nothing will change." },
    ],
    cta: { label: 'Yes, subscribe me', url: data.confirmUrl },
    reason: 'You asked to subscribe to Newbi emails.',
});
