import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { t } from '../../i18n';

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
        .then(() => toast?.(t('Link copied.'), 'success'))
        .catch(() => toast?.(t('Copy this link from the address bar.'), 'info'));
};

/* One form: the cached public API first, then Firestore. null when there's none. */
export const loadForm = async (id) => {
    if (!id) return null;
    try {
        const res = await fetch(`/api/forms?id=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (json?.success && json.form) return json.form;
    } catch { /* fall back to Firestore */ }
    if (!db) return null;
    const snap = await getDoc(doc(db, 'forms', id)).catch(() => null);
    return snap?.exists() ? { id: snap.id, ...snap.data() } : null;
};
