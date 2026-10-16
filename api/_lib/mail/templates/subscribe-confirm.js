/**
 * Double opt-in for someone who unsubscribed and signs up again. It's the
 * weekly newsletter, so it's ConcertZone-branded. data: { confirmUrl }
 */
export default (data = {}) => ({
    sender: 'weekly',
    kind: 'transactional',
    brand: 'concertzone',
    subject: 'Confirm your Weekly by Concert Zone subscription',
    preheader: 'One tap to start getting our emails again.',
    eyebrow: 'Weekly',
    title: 'Confirm your subscription',
    blocks: [
        { p: 'You unsubscribed from our emails before, so we need you to confirm before we send you the Weekly again.' },
        { note: "If you didn't sign up, ignore this email and nothing will change." },
    ],
    cta: { label: 'Yes, subscribe me', url: data.confirmUrl },
    reason: 'You asked to subscribe to Weekly by Concert Zone.',
});
