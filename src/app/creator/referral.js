import { appUrl, APP_ORIGIN } from '../host';

/* Invite links and share messages for the referral tab and the refer banner. */

export const inviteUrl = (code) => {
    if (!code) return null;
    const path = `/creator/apply?ref=${encodeURIComponent(code)}`;
    const url = appUrl(path);
    return /^https?:/.test(url) ? url : `${typeof window !== 'undefined' ? window.location.origin : APP_ORIGIN}${url}`;
};

const INVITE_TEXT = 'Join me on Newbi Creators: brands and shows invite creators to campaigns for passes, products and paid work. Apply with my link';

export const inviteMessage = (link) => `${INVITE_TEXT}: ${link}`;

export const whatsappShareUrl = (link) => `https://wa.me/?text=${encodeURIComponent(inviteMessage(link))}`;

/* Native share sheet, else copy. Call it straight from the tap so Safari treats it as a user gesture. */
export const shareInvite = (link, onCopy) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: 'Join Newbi Creators', text: `${INVITE_TEXT}:`, url: link }).catch(() => {});
    } else {
        onCopy?.();
    }
};
