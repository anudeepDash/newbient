import { appUrl, APP_ORIGIN } from '../host';
import { t } from '../../i18n';
import { OG_CARD_VERSION } from '../seo';

/* Invite links and share messages for the referral tab and the refer banner. */

// `v` is the share-card version: WhatsApp caches a link's preview by its exact
// URL, so a new card needs a new link for chats to fetch it. The page ignores it.
export const inviteUrl = (code) => {
    if (!code) return null;
    const path = `/creator/apply?ref=${encodeURIComponent(code)}&v=${OG_CARD_VERSION}`;
    const url = appUrl(path);
    return /^https?:/.test(url) ? url : `${typeof window !== 'undefined' ? window.location.origin : APP_ORIGIN}${url}`;
};

const inviteText = () => t('Join me on Newbi Creators: brands and shows invite creators to campaigns for passes, products and paid work. Apply with my link');

export const inviteMessage = (link) => `${inviteText()}: ${link}`;

export const whatsappShareUrl = (link) => `https://wa.me/?text=${encodeURIComponent(inviteMessage(link))}`;

/* Native share sheet, else copy. Call it straight from the tap so Safari treats it as a user gesture. */
export const shareInvite = (link, onCopy) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: t('Join Newbi Creators'), text: `${inviteText()}:`, url: link }).catch(() => {});
    } else {
        onCopy?.();
    }
};
