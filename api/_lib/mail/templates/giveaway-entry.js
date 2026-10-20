import { firstName, formatDate } from '../layout.js';

/** data: { name, giveawayName, endsAt, giveawayUrl, prize } */
export default (data = {}) => ({
    sender: 'noreply',
    kind: 'transactional',
    subject: `You're entered: ${data.giveawayName || 'Newbi giveaway'}`,
    preheader: data.endsAt ? `Your entry is confirmed. Winners are picked after ${formatDate(data.endsAt)}.` : 'Your entry is confirmed.',
    eyebrow: 'Giveaway',
    title: 'Your entry is confirmed',
    blocks: [
        { p: `Hi ${firstName(data.name)}, your entry${data.giveawayName ? ` for ${data.giveawayName}` : ''} is confirmed. We pick winners after it closes and contact them by email.` },
        { details: [['Prize', data.prize], ['Closes', formatDate(data.endsAt, { withTime: true })]] },
        { p: 'Friends who enter through your link move you up the leaderboard.' },
    ],
    cta: data.giveawayUrl ? { label: 'View giveaway', url: data.giveawayUrl } : null,
    reason: "You're getting this because you entered a Newbi giveaway.",
});
