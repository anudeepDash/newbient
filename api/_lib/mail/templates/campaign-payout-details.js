import { firstName } from '../layout.js';

/**
 * Sent only when the team asks, from a campaign's Payouts (outreach-ask-payout):
 * where should we pay you? The button opens their payout details page.
 * data: { name, campaignTitle, image, payUrl }
 */
export default (data = {}) => {
    const title = data.campaignTitle || 'your campaign';
    return {
        sender: 'creators',
        kind: 'transactional',
        subject: `Add your payout details for ${title}`,
        preheader: 'Your UPI ID or bank account, so we can pay you for this campaign.',
        eyebrow: 'Campaign payout',
        title: 'Where should we pay you?',
        hero: data.image ? { url: data.image, alt: title } : null,
        blocks: [
            { p: `Hi ${firstName(data.name)}, to pay you for ${title}, we need your payout details.` },
            {
                steps: [
                    ['Open your payout page', 'The button below. No sign-in needed, it’s your personal link.'],
                    ['Add a UPI ID or bank account', 'A UPI ID is quickest. For a bank account, add the name on it, the account number and the IFSC.'],
                    ['That’s it', 'You’ll see “Details added” on the page. You can change them there any time before we pay you.'],
                ],
            },
            { note: 'Only the Newbi team sees your details. We will never ask for your UPI PIN, a password or an OTP.' },
        ],
        cta: data.payUrl ? { label: 'Add payout details', url: data.payUrl } : null,
        reason: "You're getting this because you're taking part in a Newbi creator campaign.",
    };
};
