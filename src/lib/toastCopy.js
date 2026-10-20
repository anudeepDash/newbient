import { t } from '../i18n';

// Helpers that keep toast banners short, human and readable.

export const TOAST_TYPES = ['success', 'error', 'warning', 'info'];

// Shown to screen readers and as a fallback heading when a toast has no title.
// Getters, so the text follows the current language at read time.
export const TOAST_LABELS = {
    get success() { return t('Done'); },
    get error() { return t("Couldn't complete that"); },
    get warning() { return t('Heads up'); },
    get info() { return t('Good to know'); },
};

// The short label above each banner's text, next to the dot.
export const TOAST_EYEBROWS = {
    get success() { return t('Done'); },
    get error() { return t('Didn’t work'); },
    get warning() { return t('Heads up'); },
    get info() { return t('Note'); },
};

const SUPPORT_EMAIL = 'support@newbi.live';

// Raw technical errors (mostly Firebase) translated into plain language.
// Only code-shaped patterns here, so hand-written messages are never rewritten by accident.
const FRIENDLY_ERRORS = [
    [/auth\/(popup-closed-by-user|cancelled-popup-request)/i, 'Sign-in was cancelled.'],
    [/auth\/(wrong-password|invalid-credential|invalid-login-credentials)/i, "That email or password doesn't look right."],
    [/auth\/user-not-found/i, "We couldn't find an account with that email."],
    [/auth\/email-already-in-use/i, 'An account with this email already exists. Try signing in instead.'],
    [/auth\/weak-password/i, 'Please choose a stronger password (at least 6 characters).'],
    [/auth\/invalid-email/i, "That email address doesn't look right."],
    [/auth\/requires-recent-login/i, 'For your security, please sign out and sign back in, then try again.'],
    [/auth\/too-many-requests/i, 'Too many attempts. Please wait a moment and try again.'],
    [/auth\/invalid-phone-number/i, "That phone number doesn't look right. Include your country code."],
    [/auth\/(invalid-verification-code|code-expired)/i, "That code didn't work. Check it or request a new one."],
    [/permission-denied|missing or insufficient permissions/i, "You don't have permission to do that."],
    [/resource-exhausted|quota exceeded/i, "We're getting a lot of requests right now. Please try again in a minute."],
    [/failed to fetch|networkerror|network-request-failed|err_internet_disconnected|client is offline/i, 'You seem to be offline. Check your connection and try again.'],
    [/deadline-exceeded/i, 'That took too long. Please try again.'],
    [/(firestore|functions)\/unavailable/i, 'The service is temporarily unavailable. Please try again shortly.'],
    [/no document to update/i, "We couldn't find that item. It may have been removed."],
];

const looksTechnical = (text) =>
    /firebase|firestore|\b(auth|storage|firestore|functions)\/[a-z-]+|\bundefined\b|null is not|cannot read prop|typeerror|referenceerror|is not a function|status code|unexpected token/i.test(text);

/**
 * Normalises whatever was passed to addToast (string, Error, object) into a clean sentence.
 */
export const toFriendlyMessage = (input, type) => {
    let text = input;
    if (input instanceof Error) text = input.message;
    else if (input && typeof input === 'object') text = input.message || input.error || '';
    text = String(text ?? '').trim();

    // Strip noisy prefixes/suffixes like "FirebaseError: ..." or "... (auth/xyz)."
    const raw = text;
    text = text
        .replace(/^(Firebase(Error)?|Error|TypeError):\s*/i, '')
        .replace(/^Firebase:\s*/i, '')
        .replace(/\s*\((auth|storage|firestore|functions)\/[a-z-]+\)\.?$/i, '')
        .trim();

    if (type === 'error') {
        for (const [pattern, friendly] of FRIENDLY_ERRORS) {
            if (pattern.test(raw)) return t(friendly);
        }
        if (!text || looksTechnical(text)) return t('Something went wrong. Please try again.');
    }

    if (!text) return TOAST_LABELS[type] || '';
    // Make sure it reads like a sentence.
    text = text.charAt(0).toUpperCase() + text.slice(1);
    return text;
};

/**
 * Ticketing and payment problems can't usually be fixed by retrying, so point people to support.
 */
export const getSupportHint = (message, type, code) => {
    if (type !== 'error') return null;
    const m = String(message || '').toLowerCase();
    const isMoneyRelated = /^(TKT|EVT|PAY)/.test(code || '') || m.includes('ticket') || m.includes('payment');
    return isMoneyRelated && !m.includes(SUPPORT_EMAIL) ? t('Need help? Email {email}', { email: SUPPORT_EMAIL }) : null;
};

/**
 * Longer messages and more serious types stay on screen longer.
 */
export const getToastDuration = (type, message = '') => {
    const base = { success: 3500, info: 4500, warning: 6000, error: 7000 }[type] ?? 4500;
    const extraChars = Math.max(0, String(message).length - 60);
    return Math.min(base + extraChars * 45, 12000);
};
