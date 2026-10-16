import { isIOS, isInAppBrowser, isStandalone } from '../../lib/platform';

/*
 * Keeps a pass page usable without signal: once it has loaded, the service
 * worker saves this page and the scripts it used, and serves them from the
 * phone when the network is gone (see public/firebase-messaging-sw.js).
 */
export const warmOfflineCache = () => {
    try {
        if (!('serviceWorker' in navigator)) return;
        const origin = window.location.origin;
        const urls = new Set([window.location.href]);
        (performance.getEntriesByType?.('resource') || []).forEach((entry) => {
            if (typeof entry.name === 'string' && entry.name.startsWith(origin) && /\/(assets|brand)\//.test(entry.name)) urls.add(entry.name);
        });
        document.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href]').forEach((el) => {
            const url = el.src || el.href;
            if (url && url.startsWith(origin)) urls.add(url);
        });
        navigator.serviceWorker.ready
            .then((reg) => reg.active?.postMessage({ type: 'nb-cache-pages', urls: [...urls] }))
            .catch(() => {});
    } catch { /* never block the pass */ }
};

/* iPhone Safari (not installed, not inside Instagram/WhatsApp): show how to add the pass to the Home Screen. */
export const canHintAddToHome = () => isIOS() && !isStandalone() && !isInAppBrowser();
