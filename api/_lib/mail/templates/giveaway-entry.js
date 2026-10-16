import { firstName, formatDate } from '../layout.js';

/** data: { name, giveawayName, endsAt, giveawayUrl, prize } */
export default (data = {}) => ({
    sender: 'noreply',
    kind: 'transactional',
    subject: `You're entered: ${data.giveawayName || 'Newbi giveaway'}`,
    preheader: data.endsAt ? `Winners are picked after ${formatDate(data.endsAt)}.` : "You're in the draw. Good luck!",
    eyebrow: 'Giveaway',
    title: "You're in the draw",
    blocks: [
        { p: `Hi ${firstName(data.name)}, your entry${data.giveawayName ? ` for ${data.giveawayName}` : ''} is in. Good luck!` },
        { details: [['Prize', data.prize], ['Closes', formatDate(data.endsAt, { withTime: true })]] },
        { p: 'Share your link with friends to move up the leaderboard.' },
    ],
    cta: data.giveawayUrl ? { label: 'View giveaway', url: data.giveawayUrl } : null,
    reason: "You're getting this because you entered a Newbi giveaway.",
});
