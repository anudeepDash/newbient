import { useStore as useLegacyStore } from '../../lib/store.js';

/* Small helpers shared by the Community pages. */

/* Rich text from the admin editors as plain text with paragraph breaks. */
export const plainText = (html) => String(html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

/*
 * Shares a link. navigator.share is called straight from the tap (Safari
 * refuses it after an await); without it the link is copied.
 */
export const shareLink = ({ title, text, url }) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title, text, url }).catch(() => { /* cancelled */ });
        return;
    }
    const toast = useLegacyStore.getState().addToast;
    navigator.clipboard?.writeText(url)
        .then(() => toast?.('Link copied.', 'success'))
        .catch(() => toast?.('Copy this link from the address bar.', 'info'));
};
