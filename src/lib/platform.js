/*
 * Browser checks the app needs for Safari/iPhone and in-app browsers.
 */

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');

/* iPhone, iPad and iPadOS (which reports itself as a Mac with touch). */
export const isIOS = () => {
    if (typeof navigator === 'undefined') return false;
    return /iP(hone|ad|od)/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/*
 * In-app browsers (Instagram, WhatsApp, Facebook, Snapchat, LinkedIn, X…).
 * Sign-in popups fail there, so Google sign-in uses a full-page redirect.
 */
const IN_APP_PATTERN = /(Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|Snapchat|LinkedInApp|Twitter|TikTok|musical_ly|Bytedance|Line\/|MicroMessenger)/i;

export const isInAppBrowser = () => IN_APP_PATTERN.test(ua());

/* Home-screen (standalone) mode on iOS and Android. */
export const isStandalone = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
};
